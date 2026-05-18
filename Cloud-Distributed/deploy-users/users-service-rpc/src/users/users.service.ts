import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface ImportResult {
  imported: number;
  errors: string[];
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.user.count(),
    ]);
    return { data: users, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }

  async create(data: { name: string; email: string; age: number; role?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictException(`Email ${data.email} already exists`);
    return this.prisma.user.create({
      data: { name: data.name, email: data.email, age: data.age, role: data.role || 'user' },
    });
  }

  async update(id: string, data: Partial<{ name: string; email: string; age: number; role: string }>) {
    await this.findOne(id);
    return this.prisma.user.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.user.delete({ where: { id } });
  }

  async search(name?: string, email?: string, role?: string) {
    return this.prisma.user.findMany({
      where: {
        ...(name && { name: { contains: name, mode: 'insensitive' } }),
        ...(email && { email: { contains: email, mode: 'insensitive' } }),
        ...(role && { role }),
      },
      take: 50,
    });
  }

  /**
   * Export all users to a CSV string.
   * Called via JSON-RPC exportUsers method — result is returned as a JSON array
   * so the gateway can convert it to CSV or any other format.
   */
  async exportAll(): Promise<unknown[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, age: true, role: true, createdAt: true },
    });
    return users;
  }

  /**
   * Bulk import users from an array of user records.
   * Each record is validated and inserted independently so failures don't stop the whole import.
   */
  async importMany(
    rows: Array<{ name: string; email: string; age: number; role?: string }>,
  ): Promise<ImportResult> {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new BadRequestException('rows must be a non-empty array');
    }

    let imported = 0;
    const errors: string[] = [];

    for (const row of rows) {
      if (!row.name || !row.email || !row.age) {
        errors.push(`Invalid row (${row.email ?? 'no email'}): missing name, email or age`);
        continue;
      }
      try {
        await this.create({ name: row.name, email: row.email, age: row.age, role: row.role });
        imported++;
      } catch (err) {
        errors.push(`${row.email}: ${err.message}`);
      }
    }

    return { imported, errors };
  }
}
