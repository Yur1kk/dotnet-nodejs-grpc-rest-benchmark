import {
  IsString,
  IsUUID,
  IsInt,
  IsNumber,
  IsOptional,
  IsIn,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({ example: 'uuid-of-user' })
  @IsString()
  userId: string;

  @ApiProperty({ example: 'MacBook Pro' })
  @IsString()
  product: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 1999.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({
    example: 'pending',
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'])
  status?: string;
}
