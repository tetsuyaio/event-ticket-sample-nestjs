import { PrismaClient, Role } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = (process.env.ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "admin-password-123";
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: {
      role: Role.ADMIN,
      name: process.env.ADMIN_NAME ?? "Administrator",
    },
    create: {
      email,
      passwordHash,
      name: process.env.ADMIN_NAME ?? "Administrator",
      role: Role.ADMIN,
    },
  });
}

main().finally(async () => prisma.$disconnect());
