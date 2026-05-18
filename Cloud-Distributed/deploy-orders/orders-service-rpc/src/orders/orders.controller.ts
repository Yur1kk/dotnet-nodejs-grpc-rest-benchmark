import { Controller, UseInterceptors } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { OrdersService } from './orders.service';
import { LoggingInterceptor } from '../logging.interceptor';

@UseInterceptors(LoggingInterceptor)
@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @GrpcMethod('OrdersService', 'GetOrders')
  async getOrders(data: { page: number; limit: number }) {
    const result = await this.ordersService.findAll(data.page || 1, data.limit || 10);
    return {
      data: result.data.map(o => this.serializeOrder(o)),
      meta: result.meta,
    };
  }

  @GrpcMethod('OrdersService', 'GetOrder')
  async getOrder(data: { id: string }) {
    const order = await this.ordersService.findOne(data.id);
    return this.serializeOrder(order);
  }

  @GrpcMethod('OrdersService', 'CreateOrder')
  async createOrder(data: { userId: string; product: string; quantity: number; price: number; status?: string }) {
    const order = await this.ordersService.create(data);
    return this.serializeOrder(order);
  }

  @GrpcMethod('OrdersService', 'UpdateOrder')
  async updateOrder(data: { id: string; userId?: string; product?: string; quantity?: number; price?: number; status?: string }) {
    const { id, ...rest } = data;
    const order = await this.ordersService.update(id, rest);
    return this.serializeOrder(order);
  }

  @GrpcMethod('OrdersService', 'DeleteOrder')
  async deleteOrder(data: { id: string }) {
    const order = await this.ordersService.remove(data.id);
    return this.serializeOrder(order);
  }

  private serializeOrder(order: any) {
    return {
      id: order.id,
      userId: order.userId,
      product: order.product,
      quantity: order.quantity,
      price: order.price,
      status: order.status,
      createdAt: order.createdAt?.toISOString?.() ?? order.createdAt ?? '',
      updatedAt: order.updatedAt?.toISOString?.() ?? order.updatedAt ?? '',
    };
  }
}
