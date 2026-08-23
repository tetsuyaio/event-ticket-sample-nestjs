import { EventStatus, Role } from "@prisma/client";
import { PrismaService } from "../src/prisma/prisma.service";
import { ReservationsService } from "../src/reservations/reservations.service";

describe("ReservationsService integration", () => {
  const prisma = new PrismaService();
  const service = new ReservationsService(prisma);
  const suffix = `${Date.now()}-integration`;
  let userId: string;
  let adminId: string;
  let eventId: string;

  beforeAll(async () => {
    await prisma.$connect();
    const [user, admin] = await Promise.all([
      prisma.user.create({
        data: {
          email: `${suffix}@example.com`,
          passwordHash: "unused",
          name: "User",
        },
      }),
      prisma.user.create({
        data: {
          email: `admin-${suffix}@example.com`,
          passwordHash: "unused",
          name: "Admin",
          role: Role.ADMIN,
        },
      }),
    ]);
    userId = user.id;
    adminId = admin.id;
    eventId = (
      await prisma.event.create({
        data: {
          title: "Integration",
          description: "",
          venue: "Tokyo",
          startsAt: new Date("2030-01-01"),
          endsAt: new Date("2030-01-02"),
          capacity: 1,
          status: EventStatus.PUBLISHED,
          createdBy: adminId,
        },
      })
    ).id;
  });

  afterAll(async () => {
    if (eventId) {
      await prisma.ticket.deleteMany({ where: { reservation: { eventId } } });
      await prisma.reservation.deleteMany({ where: { eventId } });
      await prisma.event.deleteMany({ where: { id: eventId } });
    }
    const ids = [userId, adminId].filter(Boolean);
    if (ids.length)
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it("予約・チケット・在庫加算を同じトランザクションで確定する", async () => {
    const reservation = await service.reserve(eventId, userId);
    expect(reservation.ticket?.status).toBe("VALID");
    await expect(
      prisma.event.findUniqueOrThrow({ where: { id: eventId } }),
    ).resolves.toMatchObject({ reservedCount: 1 });
  });
});
