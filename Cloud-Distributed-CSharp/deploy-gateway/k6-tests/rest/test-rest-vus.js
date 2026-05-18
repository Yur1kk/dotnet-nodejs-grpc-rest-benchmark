import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ─── Custom Metrics ─────────────────────────────────────────────────────────
const errorRate   = new Rate('rest_errors');
const p95Latency  = new Trend('rest_response_time', true);
const totalReqs   = new Counter('rest_total_requests');

// ─── Config ──────────────────────────────────────────────────────────────────
// Usage: k6 run -e K6_VUS=200 test-rest-vus.js
const TARGET_VUS = parseInt(__ENV.K6_VUS || '100', 10);

// Ramp-up time scales with VU count
const rampUp = TARGET_VUS <= 200  ? '30s'
             : TARGET_VUS <= 1000 ? '1m'
             : TARGET_VUS <= 3000 ? '2m'
             : '3m';

export const options = {
  stages: [
    { duration: rampUp,  target: TARGET_VUS },
    { duration: '45s',    target: TARGET_VUS }, // WARM-UP   // Ramp-up
    { duration: '5m',    target: TARGET_VUS },   // Steady load
    { duration: '30s',   target: 0 },           // Ramp-down
  ],
  thresholds: {
    http_req_duration:         [`p(95)<${TARGET_VUS <= 500 ? 1000 : TARGET_VUS <= 2000 ? 3000 : 8000}`],
    http_req_failed:           ['rate<0.10'],
    rest_errors:               ['rate<0.10'],
  },
  systemTags: ['status', 'method', 'name', 'check', 'error', 'expected_response', 'group', 'scenario'],
};

const USERS_URL = __ENV.USERS_REST_URL ? `${__ENV.USERS_REST_URL}/users` : (__ENV.REST_URL ? `${__ENV.REST_URL}/users` : 'http://localhost:3000/api/users');
const ORDERS_URL = __ENV.ORDERS_REST_URL ? `${__ENV.ORDERS_REST_URL}/orders` : (__ENV.REST_URL ? `${__ENV.REST_URL}/orders` : 'http://localhost:3000/api/orders');

export default function () {
  // 1. GET list of users
  const listRes = http.get(`${USERS_URL}?page=1&limit=100`);
  check(listRes, {
    '[REST] GET /users 200': (r) => r.status === 200,
    '[REST] GET /users has data': (r) => {
      try { return JSON.parse(r.body).data?.length > 0; } catch { return false; }
    },
  });
  errorRate.add(listRes.status >= 400);
  p95Latency.add(listRes.timings.duration);
  totalReqs.add(1);

  // 2. GET list of orders
  const ordersRes = http.get(`${ORDERS_URL}?page=1&limit=100`);
  check(ordersRes, {
    '[REST] GET /orders 200': (r) => r.status === 200,
  });
  errorRate.add(ordersRes.status >= 400);
  p95Latency.add(ordersRes.timings.duration);
  totalReqs.add(1);

  // 3. GET single user by ID
  let userId = null;
  try {
    const body = JSON.parse(listRes.body);
    userId = body.data?.[0]?.id;
  } catch {}

  if (userId) {
    const userRes = http.get(`${USERS_URL}/${userId}`, { tags: { name: `${USERS_URL}/:id` } });
    check(userRes, {
      '[REST] GET /users/:id 200': (r) => r.status === 200,
    });
    errorRate.add(userRes.status >= 400);
    p95Latency.add(userRes.timings.duration);
    totalReqs.add(1);
  }

  // 4. POST create user
  const email = `k6_rest_${Date.now()}_${Math.random().toString(36).substr(2, 6)}@test.com`;
  const createRes = http.post(
    `${USERS_URL}`,
    JSON.stringify({ name: 'k6 REST User', email, age: 25, role: 'user' }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(createRes, {
    '[REST] POST /users 201': (r) => r.status === 201,
  });
  errorRate.add(createRes.status >= 500);
  p95Latency.add(createRes.timings.duration);
  totalReqs.add(1);

  // 5. Search users
  const searchRes = http.get(`${USERS_URL}/search?role=user`);
  check(searchRes, {
    '[REST] GET /users/search 200': (r) => r.status === 200,
  });
  errorRate.add(searchRes.status >= 400);
  p95Latency.add(searchRes.timings.duration);
  totalReqs.add(1);

  sleep(TARGET_VUS <= 500 ? 1 : 0.5);
}
