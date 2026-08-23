import { JwtService } from "@nestjs/jwt";
import { Role } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "./auth.service";

jest.mock("bcrypt");

describe("AuthService", () => {
  const user = {
    id: "a",
    email: "user@example.com",
    passwordHash: "hash",
    name: "User",
    role: Role.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const prisma = {
    user: { findUnique: jest.fn(), create: jest.fn() },
  } as unknown as PrismaService;
  const jwt = {
    signAsync: jest.fn().mockResolvedValue("token"),
  } as unknown as JwtService;
  const service = new AuthService(prisma, jwt);

  beforeEach(() => jest.clearAllMocks());

  it("正しい資格情報でJWTを返す", async () => {
    jest.mocked(prisma.user.findUnique).mockResolvedValue(user);
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);
    await expect(
      service.login({ email: "USER@example.com", password: "password123" }),
    ).resolves.toMatchObject({
      accessToken: "token",
      user: { email: user.email },
    });
  });

  it("誤った資格情報を拒否する", async () => {
    jest.mocked(prisma.user.findUnique).mockResolvedValue(null);
    await expect(
      service.login({ email: user.email, password: "password123" }),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
  });
});
