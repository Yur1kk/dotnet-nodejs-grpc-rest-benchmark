import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

/** A single parsed CSV row for import */
export interface CsvUserRow {
  name: string;
  email: string;
  age: string;
  role?: string;
}

/** Result of a bulk CSV import */
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
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);
    return {
      data: users,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException(`Email ${dto.email} already exists`);

    return this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        age: dto.age,
        role: dto.role || 'user',
      },
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    return this.prisma.user.update({ where: { id }, data: dto });
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
   * Columns: id, name, email, age, role, createdAt
   */
  async exportToCsv(): Promise<string> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['id', 'name', 'email', 'age', 'role', 'createdAt'];
    const lines: string[] = [headers.join(',')];

    for (const u of users) {
      const row = [
        u.id,
        `"${u.name.replace(/"/g, '""')}"`,
        u.email,
        u.age.toString(),
        u.role,
        u.createdAt.toISOString(),
      ];
      lines.push(row.join(','));
    }

    return lines.join('\n');
  }

  /**
   * Import users from a CSV buffer.
   * Expected CSV columns: name, email, age, role (header required).
   * Skips rows with duplicate emails (returns error message per row).
   */
  async importFromCsv(csvText: string): Promise<ImportResult> {
    const lines = csvText.trim().split('\n').filter(Boolean);
    if (lines.length < 2) {
      throw new BadRequestException('CSV must have a header row and at least one data row');
    }

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase());
    const nameIdx = headers.indexOf('name');
    const emailIdx = headers.indexOf('email');
    const ageIdx = headers.indexOf('age');
    const roleIdx = headers.indexOf('role');

    if (nameIdx < 0 || emailIdx < 0 || ageIdx < 0) {
      throw new BadRequestException('CSV must contain columns: name, email, age');
    }

    let imported = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const name = cols[nameIdx];
      const email = cols[emailIdx];
      const age = parseInt(cols[ageIdx], 10);
      const role = roleIdx >= 0 ? cols[roleIdx] : 'user';

      if (!name || !email || isNaN(age)) {
        errors.push(`Line ${i + 1}: missing or invalid fields (name="${name}", email="${email}", age="${cols[ageIdx]}")`);
        continue;
      }

      try {
        await this.create({ name, email, age, role: role || 'user' });
        imported++;
      } catch (err) {
        errors.push(`Line ${i + 1} (${email}): ${err.message}`);
      }
    }

    return { imported, errors };
  }
}
