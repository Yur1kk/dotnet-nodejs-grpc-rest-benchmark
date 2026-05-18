import {
  IsString,
  IsInt,
  IsNumber,
  IsOptional,
  IsIn,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({ example: 'uuid-of-user', description: 'ID of the user placing the order' })
  @IsString()
  userId: string;

  @ApiProperty({ example: 'MacBook Pro', description: 'Product name' })
  @IsString()
  product: string;

  @ApiProperty({ example: 1, description: 'Quantity (min 1)', minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 1999.99, description: 'Price per unit', minimum: 0 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    example: 'pending',
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'])
  status?: string;
}
