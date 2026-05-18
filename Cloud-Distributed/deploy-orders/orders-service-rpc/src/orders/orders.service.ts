import { Injectable, NotFoundException, BadRequestException, OnModuleInit, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../database/prisma.service';
import { USERS_GRPC_CLIENT } from '../grpc.constants';

interface UsersGrpcService {
  getUser(data: { id: string }): any;
}

@Injectable()
export class OrdersService implements OnModuleInit {
  private usersGrpc: UsersGrpcService;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(USERS_GRPC_CLIENT) private readonly usersClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.usersGrpc = this.usersClient.getService<UsersGrpcService>('UsersService');
  }

  async findAll(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.order.count(),
    ]);
    return { data: orders, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`Order #${id} not found`);

    // Enrich with user data via gRPC call to users-service-rpc
    const user = await firstValueFrom(this.usersGrpc.getUser({ id: order.userId })).catch(() => null);
    return { ...order, user };
  }

  async create(data: { userId: string; product: string; quantity: number; price: number; status?: string }) {
    // Validate user exists via gRPC call to users-service-rpc
    try {
      await firstValueFrom(this.usersGrpc.getUser({ id: data.userId }));
    } catch {
      throw new NotFoundException(`User #${data.userId} not found`);
    }

    return this.prisma.order.create({
      data: {
        userId: data.userId,
        product: data.product,
        quantity: data.quantity,
        price: data.price,
        status: data.status || 'pending',
      },
    });
  }

  async update(id: string, data: Partial<{ userId: string; product: string; quantity: number; price: number; status: string }>) {
    await this.findOne(id);
    return this.prisma.order.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.order.delete({ where: { id } });
  }
}
