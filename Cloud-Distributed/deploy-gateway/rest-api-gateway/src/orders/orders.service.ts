import { Injectable, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrdersService {
  private readonly baseUrl =
    process.env.ORDERS_SERVICE_URL || 'http://localhost:3004';

  constructor(private readonly httpService: HttpService) {}

  private async call<T = unknown>(method: string, path: string, data?: unknown): Promise<T> {
    try {
      const resp = await firstValueFrom(
        this.httpService.request<T>({
          method,
          url: `${this.baseUrl}/orders${path}`,
          data,
        }),
      );
      return resp.data;
    } catch (err) {
      throw new HttpException(
        err.response?.data || 'Upstream REST error',
        err.response?.status || 500,
      );
    }
  }

  findAll(page: number, limit: number) {
    return this.call('GET', `?page=${page}&limit=${limit}`);
  }

  findOne(id: string) {
    return this.call('GET', `/${id}`);
  }

  create(dto: CreateOrderDto) {
    return this.call('POST', '', dto);
  }

  update(id: string, dto: UpdateOrderDto) {
    return this.call('PUT', `/${id}`, dto);
  }

  remove(id: string) {
    return this.call('DELETE', `/${id}`);
  }
}
