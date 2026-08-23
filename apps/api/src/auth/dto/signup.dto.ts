import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class SignupDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  @MaxLength(254)
  email!: string;
  @ApiProperty({ minLength: 8, example: "password123" })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
  @ApiProperty({ example: "Test User" })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;
}
