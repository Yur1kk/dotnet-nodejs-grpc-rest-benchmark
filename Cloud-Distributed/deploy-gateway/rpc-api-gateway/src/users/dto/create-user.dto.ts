import {
  IsString,
  IsEmail,
  IsInt,
  IsOptional,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe', description: 'Full name of the user' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'john@example.com', description: 'Unique email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 25, description: 'Age between 1 and 120', minimum: 1, maximum: 120 })
  @IsInt()
  @Min(1)
  @Max(120)
  age: number;

  @ApiPropertyOptional({
    example: 'user',
    enum: ['user', 'admin', 'moderator'],
    description: 'User role',
  })
  @IsOptional()
  @IsString()
  @IsIn(['user', 'admin', 'moderator'])
  role?: string;
}
