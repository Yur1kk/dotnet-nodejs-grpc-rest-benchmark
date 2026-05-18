import { Injectable, Inject, OnModuleInit, HttpException } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ORDERS_GRPC } from '../grpc.constants';

export interface OrderRecord {
  id: string; userId: string; product: string; quantity: number;
  price: number; status: string; createdAt: string; updatedAt: string;
}

interface OrdersGrpcService {
  getOrders(data: { page: number; limit: number }): Observable<{ data: OrderRecord[]; meta: object }>;
  getOrder(data: { id: string }): Observable<OrderRecord>;
  createOrder(data: CreateOrderDto): Observable<OrderRecord>;
  updateOrder(data: { id: string } & Partial<UpdateOrderDto>): Observable<OrderRecord>;
  deleteOrder(data: { id: string }): Observable<OrderRecord>;
}

@Injectable()
export class OrdersService implements OnModuleInit {
  private grpc: OrdersGrpcService;

  constructor(@Inject(ORDERS_GRPC) private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.grpc = this.client.getService<OrdersGrpcService>('OrdersService');
  }

  private async call<T>(obs: Observable<T>): Promise<T> {
    try {
      return await firstValueFrom(obs);
    } catch (err) {
      const code = err?.code;
      if (code === 5) throw new HttpException('Not found', 404);
      throw new HttpException(err?.details || 'gRPC upstream error', 502);
    }
  }

  findAll(page: number, limit: number) {
    return this.call(this.grpc.getOrders({ page, limit }));
  }

  findOne(id: string) {
    return this.call(this.grpc.getOrder({ id }));
  }

  create(dto: CreateOrderDto) {
    return this.call(this.grpc.createOrder(dto));
  }

  update(id: string, dto: UpdateOrderDto) {
    return this.call(this.grpc.updateOrder({ id, ...dto }));
  }

  remove(id: string) {
    return this.call(this.grpc.deleteOrder({ id }));
  }
}
