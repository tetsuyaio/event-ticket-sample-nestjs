import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { SignupDto } from "./dto/signup.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import { AuthResponse, AuthUser } from "./auth.types";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post("signup") signup(@Body() dto: SignupDto): Promise<AuthResponse> {
    return this.auth.signup(dto);
  }
  @Post("login") @HttpCode(HttpStatus.OK) login(
    @Body() dto: LoginDto,
  ): Promise<AuthResponse> {
    return this.auth.login(dto);
  }
  @Get("me") @UseGuards(JwtAuthGuard) @ApiBearerAuth() me(
    @CurrentUser() user: AuthUser,
  ): AuthUser {
    return user;
  }
}
