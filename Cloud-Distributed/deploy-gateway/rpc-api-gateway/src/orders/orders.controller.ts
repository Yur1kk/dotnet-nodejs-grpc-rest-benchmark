import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: '[RPC Gateway] List orders — internally via JSON-RPC getOrders' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.ordersService.findAll(+page, +limit);
  }

  @Get(':id')
  @ApiOperation({ summary: '[RPC Gateway] Get order — internally via JSON-RPC getOrderById' })
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: '[RPC Gateway] Create order — triggers JSON-RPC inter-service call inside orders-service',
  })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '[RPC Gateway] Update order — internally via JSON-RPC updateOrder' })
  @ApiParam({ name: 'id', type: String })
  update(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.ordersService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '[RPC Gateway] Delete order — internally via JSON-RPC deleteOrder' })
  @ApiParam({ name: 'id', type: String })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }
}
