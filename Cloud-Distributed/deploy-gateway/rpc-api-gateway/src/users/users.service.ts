import { Injectable, Inject, OnModuleInit, HttpException } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { USERS_GRPC } from '../grpc.constants';

export interface UserRecord {
  id: string; name: string; email: string; age: number; role: string; createdAt: string; updatedAt: string;
}
export interface PaginatedUsers {
  data: UserRecord[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}
export interface ImportResult { imported: number; errors: string[] }

interface UsersGrpcService {
  getUsers(data: { page: number; limit: number }): Observable<PaginatedUsers>;
  getUser(data: { id: string }): Observable<UserRecord>;
  createUser(data: CreateUserDto): Observable<UserRecord>;
  updateUser(data: { id: string } & Partial<UpdateUserDto>): Observable<UserRecord>;
  deleteUser(data: { id: string }): Observable<UserRecord>;
  searchUsers(data: { name?: string; email?: string; role?: string }): Observable<{ data: UserRecord[] }>;
  exportUsers(data: Record<string, never>): Observable<{ users: UserRecord[] }>;
  importUsers(data: { rows: unknown[] }): Observable<ImportResult>;
}

@Injectable()
export class UsersService implements OnModuleInit {
  private grpc: UsersGrpcService;

  constructor(@Inject(USERS_GRPC) private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.grpc = this.client.getService<UsersGrpcService>('UsersService');
  }

  private async call<T>(obs: Observable<T>): Promise<T> {
    try {
      return await firstValueFrom(obs);
    } catch (err) {
      const code = err?.code;
      if (code === 5) throw new HttpException('Not found', 404);
      if (code === 6) throw new HttpException('Already exists', 409);
      throw new HttpException(err?.details || 'gRPC upstream error', 502);
    }
  }

  findAll(page: number, limit: number) {
    return this.call(this.grpc.getUsers({ page, limit }));
  }

  findOne(id: string) {
    return this.call(this.grpc.getUser({ id }));
  }

  search(name?: string, email?: string, role?: string) {
    return this.call(this.grpc.searchUsers({ name: name ?? '', email: email ?? '', role: role ?? '' }))
      .then(r => r.data);
  }

  create(dto: CreateUserDto) {
    return this.call(this.grpc.createUser(dto));
  }

  update(id: string, dto: UpdateUserDto) {
    return this.call(this.grpc.updateUser({ id, ...dto }));
  }

  remove(id: string) {
    return this.call(this.grpc.deleteUser({ id }));
  }

  async exportCsv(): Promise<string> {
    const res = await this.call(this.grpc.exportUsers({}));
    return this.jsonArrayToCsv(res.users);
  }

  async importCsv(file: Express.Multer.File): Promise<ImportResult> {
    const rows = this.parseCsv(file.buffer.toString('utf-8'));
    return this.call(this.grpc.importUsers({ rows }));
  }

  private jsonArrayToCsv(users: UserRecord[]): string {
    const headers: Array<keyof UserRecord> = ['id', 'name', 'email', 'age', 'role', 'createdAt'];
    const lines: string[] = [headers.join(',')];
    for (const u of users) {
      lines.push([u.id, `"${u.name.replace(/"/g, '""')}"`, u.email, u.age, u.role, u.createdAt].join(','));
    }
    return lines.join('\n');
  }

  private parseCsv(csv: string): Array<Record<string, string>> {
    const lines = csv.trim().split('\n').filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
    });
  }
}
