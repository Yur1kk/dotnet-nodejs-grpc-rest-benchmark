import grpc from 'k6/net/grpc';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ─── Custom Metrics ─────────────────────────────────────────────────────────
const errorRate   = new Rate('grpc_direct_errors');
const p95Latency  = new Trend('grpc_direct_response_time', true);
const totalReqs   = new Counter('grpc_direct_total_requests');

// ─── Config ──────────────────────────────────────────────────────────────────
const TARGET_VUS = parseInt(__ENV.K6_VUS || '100', 10);
const USERS_GRPC_ADDR = __ENV.USERS_ADDR || '10.186.0.3:5003';
const ORDERS_GRPC_ADDR = __ENV.ORDERS_ADDR || '10.186.0.4:5005';

// Ramp-up time scales with VU count
const rampUp = TARGET_VUS <= 200  ? '30s'
             : TARGET_VUS <= 1000 ? '1m'
             : TARGET_VUS <= 3000 ? '2m'
             : '3m';

export const options = {
  stages: [
    { duration: rampUp,  target: TARGET_VUS },
    { duration: '5m',    target: TARGET_VUS },
    { duration: '30s',   target: 0 },
  ],
};

const usersClient = new grpc.Client();
const ordersClient = new grpc.Client();

// Load proto definitions from the mounted volume
usersClient.load(['/proto'], 'users.proto');
ordersClient.load(['/proto'], 'orders.proto');

export default function () {
  // 1. Connection (once per VU)
  if (__ITER === 0) {
    usersClient.connect(USERS_GRPC_ADDR, { plaintext: true });
    ordersClient.connect(ORDERS_GRPC_ADDR, { plaintext: true });
  }

  // A. [List Users]
  const listParams = { page: 1, limit: 100 };
  const listStart = Date.now();
  const listRes = usersClient.invoke('users.UsersService/GetUsers', listParams);
  p95Latency.add(Date.now() - listStart);
  
  check(listRes, {
    '[gRPC DIRECT] GetUsers status OK': (r) => r && r.status === grpc.StatusOK,
    '[gRPC DIRECT] GetUsers has data': (r) => r.message && r.message.data && r.message.data.length > 0,
  });

  errorRate.add(listRes.status !== grpc.StatusOK);

  // B. [List Orders]
  const ordersStart = Date.now();
  const ordersRes = ordersClient.invoke('orders.OrdersService/GetOrders', { page: 1, limit: 100 });
  p95Latency.add(Date.now() - ordersStart);

  check(ordersRes, {
    '[gRPC DIRECT] GetOrders status OK': (r) => r && r.status === grpc.StatusOK,
  });
  errorRate.add(ordersRes.status !== grpc.StatusOK);

  // C. [Get Single User]
  let userId = null;
  if (listRes.message && listRes.message.data && listRes.message.data[0]) {
    userId = listRes.message.data[0].id;
  }

  if (userId) {
    const userStart = Date.now();
    const userRes = usersClient.invoke('users.UsersService/GetUser', { id: userId });
    p95Latency.add(Date.now() - userStart);

    check(userRes, {
      '[gRPC DIRECT] GetUser status OK': (r) => r && r.status === grpc.StatusOK,
    });
    errorRate.add(userRes.status !== grpc.StatusOK);
  }

  // D. [Create User]
  const email = `k6_direct_${Date.now()}_${Math.random().toString(36).substr(2, 6)}@test.com`;
  const createStart = Date.now();
  const createRes = usersClient.invoke('users.UsersService/CreateUser', {
    name: 'k6 Direct User',
    email: email,
    age: 25,
    role: 'user'
  });
  p95Latency.add(Date.now() - createStart);
  check(createRes, {
    '[gRPC DIRECT] CreateUser status OK': (r) => r && r.status === grpc.StatusOK,
  });
  errorRate.add(createRes.status !== grpc.StatusOK);

  // E. [Search Users]
  const searchStart = Date.now();
  const searchRes = usersClient.invoke('users.UsersService/SearchUsers', { role: 'user' });
  p95Latency.add(Date.now() - searchStart);
  check(searchRes, {
    '[gRPC DIRECT] SearchUsers status OK': (r) => r && r.status === grpc.StatusOK,
  });
  errorRate.add(searchRes.status !== grpc.StatusOK);

  totalReqs.add(5);
  sleep(TARGET_VUS <= 500 ? 1 : 0.5);
}
