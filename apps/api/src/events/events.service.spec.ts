import { EventStatus, Role } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { EventsService } from "./events.service";

describe("EventsService", () => {
  const event = {
    id: "id",
    title: "NestJS",
    description: "",
    venue: "Tokyo",
    startsAt: new Date("2030-01-01"),
    endsAt: new Date("2030-01-02"),
    capacity: 10,
    reservedCount: 3,
    status: EventStatus.PUBLISHED,
    createdBy: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const prisma = {
    event: { findFirst: jest.fn() },
  } as unknown as PrismaService;
  const service = new EventsService(prisma);

  it("残席数を含む公開イベントを返す", async () => {
    jest.mocked(prisma.event.findFirst).mockResolvedValue(event);
    await expect(service.findOne("id", Role.USER)).resolves.toMatchObject({
      remainingSeats: 7,
    });
    expect(prisma.event.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "id", status: EventStatus.PUBLISHED },
      }),
    );
  });

  it("開始時刻が終了時刻以降のイベントを拒否する", async () => {
    expect(() =>
      service.create(
        {
          title: "x",
          description: "",
          venue: "x",
          startsAt: "2030-01-02T00:00:00Z",
          endsAt: "2030-01-01T00:00:00Z",
          capacity: 1,
          status: EventStatus.DRAFT,
        },
        "admin",
      ),
    ).toThrow("startsAt must be before endsAt");
  });
});
