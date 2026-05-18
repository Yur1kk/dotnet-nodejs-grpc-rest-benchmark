import {
  IsString,
  IsEmail,
  IsInt,
  IsOptional,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 25 })
  @IsInt()
  @Min(1)
  @Max(120)
  age: number;

  @ApiProperty({ example: 'user', enum: ['user', 'admin', 'moderator'] })
  @IsOptional()
  @IsString()
  @IsIn(['user', 'admin', 'moderator'])
  role?: string;
}
