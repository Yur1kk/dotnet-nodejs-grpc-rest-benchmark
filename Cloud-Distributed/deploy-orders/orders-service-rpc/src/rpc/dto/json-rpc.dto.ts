export interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params: Record<string, any>;
  id: number | string | null;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: { code: number; message: string; data?: any };
  id: number | string | null;
}
