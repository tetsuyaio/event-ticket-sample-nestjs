import { EventStatus } from "@prisma/client";
import { Transform, Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class EventQueryDto {
  @IsOptional() @IsString() @MaxLength(200) keyword?: string;
  @IsOptional() @IsEnum(EventStatus) status?: EventStatus;
  @IsOptional() @IsDateString() startsFrom?: string;
  @IsOptional() @IsDateString() startsTo?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional()
  @Transform(({ value }) => (value === "desc" ? "desc" : "asc"))
  sort: "asc" | "desc" = "asc";
}
