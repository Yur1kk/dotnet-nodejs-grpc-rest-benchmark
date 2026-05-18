import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../database/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrdersService {
  private readonly usersServiceUrl =
    process.env.USERS_SERVICE_URL || 'http://localhost:3002';

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  // Internal REST call to users-service to validate user existence
  private async getUserByRestCall(userId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.usersServiceUrl}/users/${userId}`),
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new BadRequestException(`User #${userId} does not exist`);
      }
      throw new BadRequestException('Failed to validate user via REST call');
    }
  }

  async findAll(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count(),
    ]);
    return {
      data: orders,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`Order #${id} not found`);

    // Enrich with user data via REST call
    const user = await this.getUserByRestCall(order.userId).catch(() => null);
    return { ...order, user };
  }

  async create(dto: CreateOrderDto) {
    // Validate user exists via REST call to users-service
    await this.getUserByRestCall(dto.userId);

    return this.prisma.order.create({
      data: {
        userId: dto.userId,
        product: dto.product,
        quantity: dto.quantity,
        price: dto.price,
        status: dto.status || 'pending',
      },
    });
  }

  async update(id: string, dto: UpdateOrderDto) {
    await this.findOne(id);
    return this.prisma.order.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.order.delete({ where: { id } });
  }
}
