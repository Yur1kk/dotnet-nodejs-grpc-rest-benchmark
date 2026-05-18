import { Injectable, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private readonly baseUrl =
    process.env.USERS_SERVICE_URL || 'http://localhost:3002';

  constructor(private readonly httpService: HttpService) {}

  private async call<T = unknown>(method: string, path: string, data?: unknown): Promise<T> {
    try {
      const resp = await firstValueFrom(
        this.httpService.request<T>({
          method,
          url: `${this.baseUrl}/users${path}`,
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

  search(name?: string, email?: string, role?: string) {
    const params = new URLSearchParams();
    if (name) params.append('name', name);
    if (email) params.append('email', email);
    if (role) params.append('role', role);
    return this.call('GET', `/search?${params.toString()}`);
  }

  create(dto: CreateUserDto) {
    return this.call('POST', '', dto);
  }

  update(id: string, dto: UpdateUserDto) {
    return this.call('PUT', `/${id}`, dto);
  }

  remove(id: string) {
    return this.call('DELETE', `/${id}`);
  }

  /** Export all users as CSV — proxies to users-service-rest /users/export */
  exportCsv(): Promise<string> {
    return this.call<string>('GET', '/export');
  }

  /** Import users from CSV buffer — sends raw CSV text to users-service-rest */
  async importCsv(csvBuffer: Buffer): Promise<{ imported: number; errors: string[] }> {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', csvBuffer, { filename: 'users.csv', contentType: 'text/csv' });

    try {
      const resp = await firstValueFrom(
        this.httpService.post<{ imported: number; errors: string[] }>(
          `${this.baseUrl}/users/import`,
          form,
          { headers: form.getHeaders() },
        ),
      );
      return resp.data;
    } catch (err) {
      throw new HttpException(
        err.response?.data || 'Import upstream error',
        err.response?.status || 500,
      );
    }
  }
}
