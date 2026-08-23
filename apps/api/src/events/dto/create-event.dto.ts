import { ApiProperty } from "@nestjs/swagger";
import { EventStatus } from "@prisma/client";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateEventDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200) title!: string;
  @ApiProperty() @IsString() @MaxLength(10000) description!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(300) venue!: string;
  @ApiProperty() @IsDateString() startsAt!: string;
  @ApiProperty() @IsDateString() endsAt!: string;
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) capacity!: number;
  @ApiProperty({ enum: EventStatus, default: EventStatus.DRAFT })
  @IsEnum(EventStatus)
  status: EventStatus = EventStatus.DRAFT;
}
