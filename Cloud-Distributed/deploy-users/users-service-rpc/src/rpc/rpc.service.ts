import { Injectable } from '@nestjs/common';
import { UsersService, ImportResult } from '../users/users.service';
import { JsonRpcRequest, JsonRpcResponse } from './dto/json-rpc.dto';

@Injectable()
export class RpcService {
  constructor(private readonly usersService: UsersService) {}

  async dispatch(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const { method, params, id } = request;

    try {
      let result: unknown;

      switch (method) {
        case 'getUsers':
          result = await this.usersService.findAll(
            params.page as number || 1,
            params.limit as number || 10,
          );
          break;

        case 'getUserById':
          if (!params.id) throw { code: -32602, message: 'Missing required param: id' };
          result = await this.usersService.findOne(params.id as string);
          break;

        case 'createUser':
          if (!params.name || !params.email || !params.age) {
            throw { code: -32602, message: 'Missing required params: name, email, age' };
          }
          result = await this.usersService.create({
            name: params.name as string,
            email: params.email as string,
            age: params.age as number,
            role: params.role as string | undefined,
          });
          break;

        case 'updateUser':
          if (!params.id) throw { code: -32602, message: 'Missing required param: id' };
          result = await this.usersService.update(params.id as string, {
            name: params.name as string | undefined,
            email: params.email as string | undefined,
            age: params.age as number | undefined,
            role: params.role as string | undefined,
          });
          break;

        case 'deleteUser':
          if (!params.id) throw { code: -32602, message: 'Missing required param: id' };
          result = await this.usersService.remove(params.id as string);
          break;

        case 'searchUsers':
          result = await this.usersService.search(
            params.name as string | undefined,
            params.email as string | undefined,
            params.role as string | undefined,
          );
          break;

        /**
         * exportUsers — returns all users as a JSON array.
         * The rpc-api-gateway converts this to CSV and serves it as a file download.
         * This demonstrates the key design challenge of file operations in RPC:
         * binary/file data is returned as structured JSON, not as a raw HTTP stream.
         */
        case 'exportUsers':
          result = await this.usersService.exportAll();
          break;

        /**
         * importUsers — accepts an array of user objects and bulk-inserts them.
         * The rpc-api-gateway parses the CSV file, then sends the parsed rows here.
         * Compare: REST gateway forwards the raw multipart request; RPC gateway parses first.
         */
        case 'importUsers': {
          if (!Array.isArray(params.rows)) {
            throw { code: -32602, message: 'Missing required param: rows (array)' };
          }
          const importResult: ImportResult = await this.usersService.importMany(
            params.rows as Array<{ name: string; email: string; age: number; role?: string }>,
          );
          result = importResult;
          break;
        }

        default:
          return {
            jsonrpc: '2.0',
            error: { code: -32601, message: `Method not found: ${method}` },
            id,
          };
      }

      return { jsonrpc: '2.0', result, id };
    } catch (err) {
      if (err.status) {
        return {
          jsonrpc: '2.0',
          error: {
            code: err.status === 404 ? -32001 : err.status === 409 ? -32002 : -32000,
            message: err.message,
          },
          id,
        };
      }
      if (err.code) return { jsonrpc: '2.0', error: err, id };
      return {
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal error', data: err.message },
        id,
      };
    }
  }
}
