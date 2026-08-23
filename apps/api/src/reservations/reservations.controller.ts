import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ReservationsService } from "./reservations.service";

@ApiTags("reservations")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}
  @Post("events/:eventId/reservations") reserve(
    @Param("eventId", ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reservations.reserve(eventId, user.id);
  }
  @Get("me/reservations") list(@CurrentUser() user: AuthUser) {
    return this.reservations.list(user.id);
  }
  @Get("me/reservations/:id") find(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reservations.findOne(id, user.id);
  }
  @Delete("me/reservations/:id") @HttpCode(HttpStatus.OK) cancel(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reservations.cancel(id, user.id);
  }
}
