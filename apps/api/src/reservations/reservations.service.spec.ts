import { EventStatus, ReservationStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ReservationsService } from "./reservations.service";

describe("ReservationsService", () => {
  const tx = {
    event: { findUnique: jest.fn() },
    reservation: { findUnique: jest.fn(), create: jest.fn() },
    $executeRaw: jest.fn(),
  };
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  } as unknown as PrismaService;
  const service = new ReservationsService(prisma);

  beforeEach(() => jest.clearAllMocks());

  it("原子的更新が0件なら売切として拒否する", async () => {
    tx.event.findUnique.mockResolvedValue({
      id: "event",
      status: EventStatus.PUBLISHED,
    });
    tx.reservation.findUnique.mockResolvedValue(null);
    tx.$executeRaw.mockResolvedValue(0);
    await expect(
      service.reserve("00000000-0000-0000-0000-000000000001", "user"),
    ).rejects.toMatchObject({ code: "EVENT_SOLD_OUT" });
  });

  it("予約とチケットを同一トランザクションで作成する", async () => {
    tx.event.findUnique.mockResolvedValue({
      id: "event",
      status: EventStatus.PUBLISHED,
    });
    tx.reservation.findUnique.mockResolvedValue(null);
    tx.$executeRaw.mockResolvedValue(1);
    tx.reservation.create.mockResolvedValue({
      id: "reservation",
      status: ReservationStatus.RESERVED,
    });
    await expect(
      service.reserve("00000000-0000-0000-0000-000000000001", "user"),
    ).resolves.toMatchObject({ id: "reservation" });
    expect(tx.reservation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ticket: { create: { ticketNumber: expect.any(String) as string } },
        }),
      }),
    );
  });
});
