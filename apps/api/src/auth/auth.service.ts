import { HttpStatus, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Prisma } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { AppException } from "../common/errors/app.exception";
import { LoginDto } from "./dto/login.dto";
import { SignupDto } from "./dto/signup.dto";
import { AuthResponse, AuthUser } from "./auth.types";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async signup(dto: SignupDto): Promise<AuthResponse> {
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email.trim().toLowerCase(),
          passwordHash: await bcrypt.hash(dto.password, 12),
          name: dto.name.trim(),
        },
        select: { id: true, email: true, name: true, role: true },
      });
      return this.response(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new AppException(
          "EMAIL_ALREADY_EXISTS",
          "Email already exists",
          HttpStatus.CONFLICT,
        );
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash)))
      throw new AppException(
        "INVALID_CREDENTIALS",
        "Invalid email or password",
        HttpStatus.UNAUTHORIZED,
      );
    return this.response({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  }

  private async response(user: AuthUser): Promise<AuthResponse> {
    return {
      accessToken: await this.jwt.signAsync({ sub: user.id, role: user.role }),
      user,
    };
  }
}
