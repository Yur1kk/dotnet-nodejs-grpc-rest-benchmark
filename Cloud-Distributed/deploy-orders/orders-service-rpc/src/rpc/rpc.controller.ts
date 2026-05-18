import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { RpcService } from './rpc.service';
import { JsonRpcRequest, JsonRpcResponse } from './dto/json-rpc.dto';

@Controller('rpc')
export class RpcController {
  constructor(private readonly rpcService: RpcService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handle(@Body() request: JsonRpcRequest): Promise<JsonRpcResponse> {
    if (request.jsonrpc !== '2.0' || !request.method) {
      return {
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Invalid Request' },
        id: request?.id ?? null,
      };
    }
    return this.rpcService.dispatch(request);
  }
}
