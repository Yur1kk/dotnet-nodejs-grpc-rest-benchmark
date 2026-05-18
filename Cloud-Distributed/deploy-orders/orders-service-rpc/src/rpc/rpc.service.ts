import { Injectable } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { JsonRpcRequest, JsonRpcResponse } from './dto/json-rpc.dto';

@Injectable()
export class RpcService {
  constructor(private readonly ordersService: OrdersService) {}

  async dispatch(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const { method, params, id } = request;

    try {
      let result: any;

      switch (method) {
        case 'getOrders':
          result = await this.ordersService.findAll(params.page || 1, params.limit || 10);
          break;

        case 'getOrderById':
          if (!params.id) throw { code: -32602, message: 'Missing required param: id' };
          result = await this.ordersService.findOne(params.id);
          break;

        case 'createOrder':
          if (!params.userId || !params.product || !params.quantity || params.price === undefined) {
            throw { code: -32602, message: 'Missing required params: userId, product, quantity, price' };
          }
          result = await this.ordersService.create({
            userId: params.userId,
            product: params.product,
            quantity: params.quantity,
            price: params.price,
            status: params.status,
          });
          break;

        case 'updateOrder':
          if (!params.id) throw { code: -32602, message: 'Missing required param: id' };
          result = await this.ordersService.update(params.id, {
            product: params.product,
            quantity: params.quantity,
            price: params.price,
            status: params.status,
          });
          break;

        case 'deleteOrder':
          if (!params.id) throw { code: -32602, message: 'Missing required param: id' };
          result = await this.ordersService.remove(params.id);
          break;

        default:
          return { jsonrpc: '2.0', error: { code: -32601, message: `Method not found: ${method}` }, id };
      }

      return { jsonrpc: '2.0', result, id };
    } catch (err) {
      if (err.status) {
        return {
          jsonrpc: '2.0',
          error: { code: err.status === 404 ? -32001 : -32000, message: err.message },
          id,
        };
      }
      if (err.code) return { jsonrpc: '2.0', error: err, id };
      return { jsonrpc: '2.0', error: { code: -32603, message: 'Internal error', data: err.message }, id };
    }
  }
}
