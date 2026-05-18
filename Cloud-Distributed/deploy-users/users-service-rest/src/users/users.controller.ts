import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { LoggingInterceptor } from '../logging.interceptor';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@UseInterceptors(LoggingInterceptor)
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.usersService.findAll(+page, +limit);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search users by name, email or role' })
  @ApiQuery({ name: 'name', required: false })
  @ApiQuery({ name: 'email', required: false })
  @ApiQuery({ name: 'role', required: false, enum: ['user', 'admin', 'moderator'] })
  search(
    @Query('name') name?: string,
    @Query('email') email?: string,
    @Query('role') role?: string,
  ) {
    return this.usersService.search(name, email, role);
  }

  /**
   * GET /users/export
   * Generates and returns all users as a downloadable CSV file.
   * This endpoint is called by the REST gateway (or directly).
   */
  @Get('export')
  @ApiOperation({
    summary: 'Export all users to CSV',
    description:
      'Returns all users as a CSV file (id, name, email, age, role, createdAt). ' +
      'Called by rest-api-gateway via HTTP GET /users/export.',
  })
  async exportCsv(@Res() res: Response): Promise<void> {
    const csvData = await this.usersService.exportToCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
    res.setHeader('Content-Length', Buffer.byteLength(csvData, 'utf-8'));
    res.send(csvData);
  }

  /**
   * POST /users/import
   * Accepts a multipart CSV file and bulk-inserts users.
   * Called by the REST gateway which forwards the multipart request directly.
   */
  @Post('import')
  @ApiOperation({
    summary: 'Import users from CSV file',
    description:
      'Accepts multipart/form-data with a CSV file (columns: name, email, age, role). ' +
      'Skips rows with duplicate emails and returns a report.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'CSV file (name,email,age,role)' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async importCsv(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!file.originalname.endsWith('.csv') && file.mimetype !== 'text/csv') {
      throw new BadRequestException('Only CSV files are allowed');
    }
    const csvText = file.buffer.toString('utf-8');
    return this.usersService.importFromCsv(csvText);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user by ID' })
  @ApiParam({ name: 'id', type: String })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user by ID' })
  @ApiParam({ name: 'id', type: String })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
