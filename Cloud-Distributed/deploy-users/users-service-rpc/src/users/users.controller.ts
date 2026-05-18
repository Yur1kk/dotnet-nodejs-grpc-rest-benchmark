import { Controller, UseInterceptors } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { UsersService } from './users.service';
import { LoggingInterceptor } from '../logging.interceptor';

@UseInterceptors(LoggingInterceptor)
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @GrpcMethod('UsersService', 'GetUsers')
  async getUsers(data: { page: number; limit: number }) {
    return this.usersService.findAll(data.page || 1, data.limit || 10);
  }

  @GrpcMethod('UsersService', 'GetUser')
  async getUser(data: { id: string }) {
    const user = await this.usersService.findOne(data.id);
    return this.serializeUser(user);
  }

  @GrpcMethod('UsersService', 'CreateUser')
  async createUser(data: { name: string; email: string; age: number; role?: string }) {
    const user = await this.usersService.create(data);
    return this.serializeUser(user);
  }

  @GrpcMethod('UsersService', 'UpdateUser')
  async updateUser(data: { id: string; name?: string; email?: string; age?: number; role?: string }) {
    const { id, ...rest } = data;
    const user = await this.usersService.update(id, rest);
    return this.serializeUser(user);
  }

  @GrpcMethod('UsersService', 'DeleteUser')
  async deleteUser(data: { id: string }) {
    const user = await this.usersService.remove(data.id);
    return this.serializeUser(user);
  }

  @GrpcMethod('UsersService', 'SearchUsers')
  async searchUsers(data: { name?: string; email?: string; role?: string }) {
    const users = await this.usersService.search(data.name, data.email, data.role);
    return { data: users.map(u => this.serializeUser(u)) };
  }

  @GrpcMethod('UsersService', 'ExportUsers')
  async exportUsers(_data: Record<string, never>) {
    const users = await this.usersService.exportAll();
    return { users: (users as any[]).map(u => this.serializeUser(u)) };
  }

  @GrpcMethod('UsersService', 'ImportUsers')
  async importUsers(data: { rows: Array<{ name: string; email: string; age: number; role?: string }> }) {
    return this.usersService.importMany(data.rows);
  }

  private serializeUser(user: any) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      age: user.age,
      role: user.role,
      createdAt: user.createdAt?.toISOString?.() ?? user.createdAt ?? '',
      updatedAt: user.updatedAt?.toISOString?.() ?? user.updatedAt ?? '',
    };
  }
}
