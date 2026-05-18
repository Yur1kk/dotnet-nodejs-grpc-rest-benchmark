import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, HttpCode, HttpStatus,
  Res, UploadedFile, UseInterceptors, ParseFilePipe, FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags, ApiOperation, ApiQuery, ApiParam,
  ApiConsumes, ApiBody,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: '[REST Gateway] List users — proxied via HTTP REST to users-service' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = parseInt(process.env.DEFAULT_LIMIT || '100', 10),
  ) {
    return this.usersService.findAll(+page, +limit);
  }

  @Get('search')
  @ApiOperation({ summary: '[REST Gateway] Search users — proxied via HTTP REST' })
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
   * GET /api/users/export
   * Downloads all users as a CSV file.
   * REST ecosystem: gateway → users-service-rest via HTTP GET /users/export
   */
  @Get('export')
  @ApiOperation({
    summary: '[REST Gateway] Export users to CSV — proxied via HTTP REST',
    description: 'Downloads all users as users-export.csv',
  })
  async exportCsv(@Res() res: Response): Promise<void> {
    const csvData = await this.usersService.exportCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="users-export.csv"');
    res.send(csvData);
  }

  /**
   * POST /api/users/import
   * Accepts a CSV file and bulk-imports users.
   * REST ecosystem: gateway → users-service-rest via HTTP POST /users/import (multipart)
   */
  @Post('import')
  @ApiOperation({
    summary: '[REST Gateway] Import users from CSV — proxied via HTTP REST (multipart)',
    description: 'Upload a CSV file with columns: name,email,age,role',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  importCsv(@UploadedFile() file: Express.Multer.File) {
    return this.usersService.importCsv(file.buffer);
  }

  @Get(':id')
  @ApiOperation({ summary: '[REST Gateway] Get user by ID — proxied via HTTP REST' })
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '[REST Gateway] Create user — proxied via HTTP REST' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '[REST Gateway] Update user — proxied via HTTP REST' })
  @ApiParam({ name: 'id', type: String })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '[REST Gateway] Delete user — proxied via HTTP REST' })
  @ApiParam({ name: 'id', type: String })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
