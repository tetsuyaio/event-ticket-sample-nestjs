import { HttpStatus, Injectable } from "@nestjs/common";
import { Event, EventStatus, Prisma, Role } from "@prisma/client";
import { AppException } from "../common/errors/app.exception";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { EventQueryDto } from "./dto/event-query.dto";
import { UpdateEventDto } from "./dto/update-event.dto";

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: EventQueryDto, role?: Role) {
    const where: Prisma.EventWhereInput = {
      status: role === Role.ADMIN ? query.status : EventStatus.PUBLISHED,
      ...(query.keyword
        ? {
            OR: [
              { title: { contains: query.keyword, mode: "insensitive" } },
              { description: { contains: query.keyword, mode: "insensitive" } },
              { venue: { contains: query.keyword, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(query.startsFrom || query.startsTo
        ? {
            startsAt: {
              ...(query.startsFrom ? { gte: new Date(query.startsFrom) } : {}),
              ...(query.startsTo ? { lte: new Date(query.startsTo) } : {}),
            },
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { startsAt: query.sort },
        include: { creator: { select: { id: true, name: true } } },
      }),
      this.prisma.event.count({ where }),
    ]);
    return {
      items: items.map((event) => this.withRemaining(event)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(id: string, role?: Role) {
    const event = await this.prisma.event.findFirst({
      where: {
        id,
        ...(role === Role.ADMIN ? {} : { status: EventStatus.PUBLISHED }),
      },
      include: { creator: { select: { id: true, name: true } } },
    });
    if (!event)
      throw new AppException(
        "EVENT_NOT_FOUND",
        "Event not found",
        HttpStatus.NOT_FOUND,
      );
    return this.withRemaining(event);
  }

  create(dto: CreateEventDto, createdBy: string): Promise<Event> {
    this.validateDates(dto.startsAt, dto.endsAt);
    return this.prisma.event.create({
      data: {
        ...dto,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        createdBy,
      },
    });
  }

  async update(id: string, dto: UpdateEventDto): Promise<Event> {
    const current = await this.findRaw(id);
    const startsAt = dto.startsAt ?? current.startsAt.toISOString();
    const endsAt = dto.endsAt ?? current.endsAt.toISOString();
    this.validateDates(startsAt, endsAt);
    if (dto.capacity !== undefined && dto.capacity < current.reservedCount)
      throw new AppException(
        "CAPACITY_BELOW_RESERVED",
        "Capacity cannot be lower than reserved count",
        HttpStatus.BAD_REQUEST,
      );
    return this.prisma.event.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.startsAt ? { startsAt: new Date(dto.startsAt) } : {}),
        ...(dto.endsAt ? { endsAt: new Date(dto.endsAt) } : {}),
      },
    });
  }

  async remove(id: string): Promise<void> {
    await this.findRaw(id);
    if (await this.prisma.reservation.count({ where: { eventId: id } }))
      throw new AppException(
        "EVENT_HAS_RESERVATIONS",
        "Event with reservations cannot be deleted",
        HttpStatus.CONFLICT,
      );
    await this.prisma.event.delete({ where: { id } });
  }

  private async findRaw(id: string): Promise<Event> {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event)
      throw new AppException(
        "EVENT_NOT_FOUND",
        "Event not found",
        HttpStatus.NOT_FOUND,
      );
    return event;
  }
  private validateDates(startsAt: string, endsAt: string): void {
    if (new Date(startsAt) >= new Date(endsAt))
      throw new AppException(
        "INVALID_EVENT_DATES",
        "startsAt must be before endsAt",
        HttpStatus.BAD_REQUEST,
      );
  }
  private withRemaining<T extends Event>(
    event: T,
  ): T & { remainingSeats: number } {
    return { ...event, remainingSeats: event.capacity - event.reservedCount };
  }
}
