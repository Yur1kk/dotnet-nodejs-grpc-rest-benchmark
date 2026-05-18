import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, HttpCode, HttpStatus,
  Res, UploadedFile, UseInterceptors,
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
  @ApiOperation({ summary: '[RPC Gateway] List users — internally calls JSON-RPC getUsers' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.usersService.findAll(+page, +limit);
  }

  @Get('search')
  @ApiOperation({ summary: '[RPC Gateway] Search users — internally calls JSON-RPC searchUsers' })
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
   * Downloads all users as CSV file.
   * RPC ecosystem: gateway calls JSON-RPC exportUsers → converts result to CSV locally.
   * Compare with REST ecosystem: gateway proxies to /users/export endpoint directly.
   */
  @Get('export')
  @ApiOperation({
    summary: '[RPC Gateway] Export users to CSV — calls JSON-RPC exportUsers, converts to CSV',
    description:
      'In the RPC ecosystem the gateway calls exportUsers via JSON-RPC and converts the result to CSV in-process. ' +
      'In the REST ecosystem the gateway simply proxies the HTTP stream.',
  })
  async exportCsv(@Res() res: Response): Promise<void> {
    const csvData = await this.usersService.exportCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="users-rpc-export.csv"');
    res.send(csvData);
  }

  /**
   * POST /api/users/import
   * Accepts a CSV file, parses it in the gateway, then calls createUser via JSON-RPC per row.
   * Compare with REST ecosystem: gateway forwards multipart to users-service directly.
   */
  @Post('import')
  @ApiOperation({
    summary: '[RPC Gateway] Import users from CSV — parses CSV, calls JSON-RPC createUser per row',
    description:
      'The RPC gateway parses the CSV file itself, then sends individual createUser JSON-RPC ' +
      'requests to users-service-rpc. Demonstrates a key design difference vs REST.',
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
    return this.usersService.importCsv(file);
  }

  @Get(':id')
  @ApiOperation({ summary: '[RPC Gateway] Get user by ID — internally calls JSON-RPC getUserById' })
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '[RPC Gateway] Create user — internally calls JSON-RPC createUser' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '[RPC Gateway] Update user — internally calls JSON-RPC updateUser' })
  @ApiParam({ name: 'id', type: String })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '[RPC Gateway] Delete user — internally calls JSON-RPC deleteUser' })
  @ApiParam({ name: 'id', type: String })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
