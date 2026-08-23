import { HttpStatus, Injectable } from "@nestjs/common";
import {
  EventStatus,
  Prisma,
  ReservationStatus,
  TicketStatus,
} from "@prisma/client";
import { randomUUID } from "node:crypto";
import { AppException } from "../common/errors/app.exception";
import { PrismaService } from "../prisma/prisma.service";

const reservationInclude = { event: true, ticket: true } as const;

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  async reserve(eventId: string, userId: string) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const event = await tx.event.findUnique({ where: { id: eventId } });
          if (!event)
            throw new AppException(
              "EVENT_NOT_FOUND",
              "Event not found",
              HttpStatus.NOT_FOUND,
            );
          if (event.status !== EventStatus.PUBLISHED)
            throw new AppException(
              "EVENT_NOT_PUBLISHED",
              "Event is not published",
              HttpStatus.CONFLICT,
            );
          if (
            await tx.reservation.findUnique({
              where: { userId_eventId: { userId, eventId } },
            })
          )
            throw new AppException(
              "ALREADY_RESERVED",
              "You have already reserved this event",
              HttpStatus.CONFLICT,
            );

          const changed = await tx.$executeRaw(
            Prisma.sql`UPDATE "Event" SET "reservedCount" = "reservedCount" + 1, "updatedAt" = NOW() WHERE "id" = ${eventId}::uuid AND "reservedCount" < "capacity" AND "status" = 'PUBLISHED'`,
          );
          if (changed === 0)
            throw new AppException(
              "EVENT_SOLD_OUT",
              "Event is sold out",
              HttpStatus.CONFLICT,
            );
          return tx.reservation.create({
            data: {
              userId,
              eventId,
              ticket: {
                create: {
                  ticketNumber: randomUUID().replaceAll("-", "").toUpperCase(),
                },
              },
            },
            include: reservationInclude,
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new AppException(
          "ALREADY_RESERVED",
          "You have already reserved this event",
          HttpStatus.CONFLICT,
        );
      throw error;
    }
  }

  list(userId: string) {
    return this.prisma.reservation.findMany({
      where: { userId },
      include: reservationInclude,
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string, userId: string) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { id, userId },
      include: reservationInclude,
    });
    if (!reservation)
      throw new AppException(
        "RESERVATION_NOT_FOUND",
        "Reservation not found",
        HttpStatus.NOT_FOUND,
      );
    return reservation;
  }

  async cancel(id: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findFirst({
        where: { id, userId },
        select: { id: true, eventId: true, status: true },
      });
      if (!reservation)
        throw new AppException(
          "RESERVATION_NOT_FOUND",
          "Reservation not found",
          HttpStatus.NOT_FOUND,
        );
      if (reservation.status === ReservationStatus.CANCELLED)
        throw new AppException(
          "RESERVATION_ALREADY_CANCELLED",
          "Reservation is already cancelled",
          HttpStatus.CONFLICT,
        );
      const updated = await tx.reservation.updateMany({
        where: { id, userId, status: ReservationStatus.RESERVED },
        data: { status: ReservationStatus.CANCELLED, cancelledAt: new Date() },
      });
      if (updated.count === 0)
        throw new AppException(
          "RESERVATION_ALREADY_CANCELLED",
          "Reservation is already cancelled",
          HttpStatus.CONFLICT,
        );
      await tx.ticket.update({
        where: { reservationId: id },
        data: { status: TicketStatus.CANCELLED },
      });
      await tx.$executeRaw(
        Prisma.sql`UPDATE "Event" SET "reservedCount" = "reservedCount" - 1, "updatedAt" = NOW() WHERE "id" = ${reservation.eventId}::uuid AND "reservedCount" > 0`,
      );
      return tx.reservation.findUniqueOrThrow({
        where: { id },
        include: reservationInclude,
      });
    });
  }
}
