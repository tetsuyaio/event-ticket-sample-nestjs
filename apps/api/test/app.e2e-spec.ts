import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { EventStatus, Role } from "@prisma/client";
import request = require("supertest");
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { HttpExceptionFilter } from "../src/common/filters/http-exception.filter";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Event Ticket API (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = `${Date.now()}-e2e`;
  const password = "password123";
  let adminId: string;
  let adminToken: string;
  let eventId: string;
  const userIds: string[] = [];

  beforeAll(async () => {
    process.env.JWT_SECRET = "e2e-secret-with-at-least-32-characters";
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    prisma = app.get(PrismaService);
    const hash = await import("bcrypt").then((bcrypt) =>
      bcrypt.hash(password, 12),
    );
    const admin = await prisma.user.create({
      data: {
        email: `admin-${suffix}@example.com`,
        passwordHash: hash,
        name: "Admin",
        role: Role.ADMIN,
      },
    });
    adminId = admin.id;
    adminToken = (
      await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: admin.email, password })
        .expect(200)
    ).body.accessToken as string;
  });

  afterAll(async () => {
    if (eventId) {
      await prisma.ticket.deleteMany({ where: { reservation: { eventId } } });
      await prisma.reservation.deleteMany({ where: { eventId } });
      await prisma.event.deleteMany({ where: { id: eventId } });
    }
    const ids = [adminId, ...userIds].filter(Boolean);
    if (ids.length)
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  it("signup、me、Admin event作成、同時予約、cancelを処理する", async () => {
    const users = await Promise.all(
      [1, 2].map(async (number) => {
        const response = await request(app.getHttpServer())
          .post("/auth/signup")
          .send({
            email: `user-${number}-${suffix}@example.com`,
            password,
            name: `User ${number}`,
          })
          .expect(201);
        userIds.push(response.body.user.id as string);
        await request(app.getHttpServer())
          .get("/auth/me")
          .set("Authorization", `Bearer ${response.body.accessToken as string}`)
          .expect(200);
        return response.body.accessToken as string;
      }),
    );

    const created = await request(app.getHttpServer())
      .post("/events")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Capacity One",
        description: "E2E",
        venue: "Tokyo",
        startsAt: "2030-01-01T00:00:00.000Z",
        endsAt: "2030-01-02T00:00:00.000Z",
        capacity: 1,
        status: EventStatus.PUBLISHED,
      })
      .expect(201);
    eventId = created.body.id as string;

    const results = await Promise.all(
      users.map((token) =>
        request(app.getHttpServer())
          .post(`/events/${eventId}/reservations`)
          .set("Authorization", `Bearer ${token}`),
      ),
    );
    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    expect(results.find((result) => result.status === 409)?.body.code).toBe(
      "EVENT_SOLD_OUT",
    );
    await expect(
      prisma.event.findUniqueOrThrow({ where: { id: eventId } }),
    ).resolves.toMatchObject({ reservedCount: 1 });

    const winner = results.findIndex((result) => result.status === 201);
    const reservationId = results[winner].body.id as string;
    await request(app.getHttpServer())
      .delete(`/me/reservations/${reservationId}`)
      .set("Authorization", `Bearer ${users[winner]}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.ticket.status).toBe("CANCELLED");
      });
    await expect(
      prisma.event.findUniqueOrThrow({ where: { id: eventId } }),
    ).resolves.toMatchObject({ reservedCount: 0 });
  });
});
