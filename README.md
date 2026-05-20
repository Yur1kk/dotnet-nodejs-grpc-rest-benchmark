# Порівняльний аналіз REST та gRPC у розподілених мікросервісних системах

> **Програмно-інфраструктурний стенд** для експериментального порівняння пропускної здатності, затримок та ефективності використання ресурсів між архітектурними стилями REST (HTTP/1.1 + JSON) та gRPC (HTTP/2 + Protocol Buffers) на платформах **.NET 8** та **Node.js**.

---

## Автор

| Поле | Значення |
|------|----------|
| **ПІБ** | Сорока Юрій Владиславович |
| **Група** | ФЕІ-42 |
| **Науковий керівник** | Гусак Олег Васильович |
| **Дата виконання** | 18.05.2026 |

---

## Технологічний стек

| Категорія | Технології |
|-----------|-----------|
| **Мови програмування** | C# (.NET 8), TypeScript (Node.js), JavaScript (k6) |
| **Фреймворки** | ASP.NET Core, NestJS |
| **ORM / БД** | Entity Framework Core, Prisma ORM, PostgreSQL |
| **Телеметрія** | InfluxDB (time-series storage), Grafana (dashboarding) |
| **Навантажувальне тестування** | k6 (Grafana Labs) |
| **Контейнеризація** | Docker, Docker Compose |
| **Хмарна платформа** | Google Cloud Platform (GCP) |

---

## Архітектура системи

Система побудована як **розподілена мікросервісна архітектура** з двома незалежними доменами та двома режимами доступу.

### Домени

- **Users Service** — управління записами користувачів (CRUD), збереження у PostgreSQL.
- **Orders Service** — управління замовленнями з міжсервісною перевіркою існування користувача перед створенням замовлення.

### Режими доступу

```
Клієнт
  │
  ├─► [REST Gateway] ──────► [REST Microservices]   (HTTP/1.1 ↔ HTTP/1.1 + JSON)
  │
  └─► [gRPC Gateway] ──────► [gRPC Microservices]   (HTTP/1.1 → HTTP/2 + Protobuf)
         (трансляція протоколів)
```

| Режим | Опис |
|-------|------|
| **Gateway Mode** | Клієнт відправляє REST-запит на API-шлюз. Шлюз транслює його у внутрішній gRPC-виклик до відповідного мікросервісу. |
| **Direct Mode** | Клієнт взаємодіє безпосередньо з мікросервісом, минаючи шлюз. Використовується для чистого порівняння протоколів без оверхеду проксі. |

Обидва домени реалізовані у двох варіантах: **Node.js (NestJS)** та **.NET 8 (ASP.NET Core)**, що дозволяє порівнювати не лише протоколи, а й ефективність рантаймів.

---

## Структура репозиторію

```
dotnet-nodejs-grpc-rest-benchmark/
│
├── Cloud-Distributed/                        # Node.js / NestJS екосистема
│   ├── pack.ps1                              # Скрипт упаковки артефактів
│   │
│   ├── deploy-db/                            # Інфраструктура бази даних та телеметрії
│   │   ├── docker-compose.yml                # PostgreSQL + InfluxDB + Grafana
│   │   ├── grafana/
│   │   │   ├── dashboards/                   # JSON-описи дашбордів Grafana
│   │   │   └── provisioning/                 # Автоматичне завантаження дашбордів
│   │   └── influxdb/
│   │       └── init/                         # Ініціалізаційні скрипти InfluxDB
│   │
│   ├── deploy-gateway/                       # API-шлюзи та навантажувальні тести
│   │   ├── docker-compose.yml
│   │   ├── run-tests.sh                      # Головний скрипт автоматизації тестів
│   │   ├── proto/                            # Protobuf-схеми для шлюзів
│   │   ├── rest-api-gateway/                 # NestJS REST-шлюз (HTTP проксі)
│   │   │   ├── src/
│   │   │   ├── Dockerfile
│   │   │   └── package.json
│   │   ├── rpc-api-gateway/                  # NestJS gRPC-шлюз (REST → gRPC трансляція)
│   │   │   ├── src/
│   │   │   ├── proto/
│   │   │   ├── Dockerfile
│   │   │   └── package.json
│   │   └── k6-tests/                         # Сценарії навантажувального тестування
│   │       ├── rest/
│   │       │   └── test-rest-vus.js          # k6 тест для REST шлюзу
│   │       ├── rpc/
│   │       │   └── test-rpc-vus.js           # k6 тест для gRPC шлюзу
│   │       ├── grpc-direct/
│   │       │   └── test-grpc-direct-vus.js   # k6 тест прямого gRPC виклику
│   │       ├── scripts/
│   │       │   └── compare-results.js        # Скрипт порівняльного аналізу результатів
│   │       └── results/                      # Збережені результати тестів (JSON)
│   │
│   ├── deploy-users/                         # Мікросервіси домену Users
│   │   ├── docker-compose.yml
│   │   ├── proto/
│   │   ├── users-service-rest/               # NestJS REST мікросервіс користувачів
│   │   └── users-service-rpc/                # NestJS gRPC мікросервіс користувачів
│   │
│   └── deploy-orders/                        # Мікросервіси домену Orders
│       ├── docker-compose.yml
│       ├── proto/
│       ├── orders-service-rest/              # NestJS REST мікросервіс замовлень
│       └── orders-service-rpc/               # NestJS gRPC мікросервіс замовлень
│
└── Cloud-Distributed-CSharp/                 # .NET 8 / ASP.NET Core екосистема
    ├── pack.ps1
    │
    ├── deploy-gateway/                        # .NET API-шлюзи та тести
    │   ├── docker-compose.yml
    │   ├── run-tests.sh                       # Скрипт автоматизації тестів (.NET)
    │   ├── fair-compare.sh                    # Скрипт чесного порівняння REST vs gRPC
    │   ├── proto/
    │   ├── rest-api-gateway/                  # ASP.NET Core REST-шлюз
    │   │   ├── Program.cs
    │   │   ├── RestGateway.csproj
    │   │   └── Dockerfile
    │   ├── rpc-api-gateway/                   # ASP.NET Core gRPC-шлюз
    │   │   ├── Program.cs
    │   │   ├── Proto/
    │   │   ├── RpcGateway.csproj
    │   │   └── Dockerfile
    │   └── k6-tests/                          # Аналогічна структура тестів для .NET
    │       ├── rest/
    │       ├── rpc/
    │       ├── grpc-direct/
    │       ├── scripts/
    │       └── results/
    │
    ├── deploy-users/                          # .NET мікросервіси домену Users
    │   ├── docker-compose.yml
    │   ├── users-service-rest/                # ASP.NET Core REST мікросервіс
    │   └── users-service-rpc/                 # ASP.NET Core gRPC мікросервіс
    │
    └── deploy-orders/                         # .NET мікросервіси домену Orders
        ├── docker-compose.yml
        ├── orders-service-rest/               # ASP.NET Core REST мікросервіс
        └── orders-service-rpc/                # ASP.NET Core gRPC мікросервіс
```

---

## Опис ключових компонентів

| Компонент | Призначення |
|-----------|-------------|
| `deploy-db/docker-compose.yml` | Піднімає повний стек телеметрії: PostgreSQL (реляційне сховище), InfluxDB (time-series метрики k6), Grafana (візуалізація на порту `3006`). |
| `deploy-db/grafana/` | JSON-описи дашбордів та конфігурації provisioning — Grafana автоматично завантажує їх при старті контейнера, без ручного налаштування. |
| `deploy-db/influxdb/init/` | Ініціалізаційні скрипти, що автоматично створюють бази даних `k6_rest`, `k6_rpc` та `k6_grpc_direct` при першому запуску InfluxDB. |
| `rest-api-gateway/` | Легкий NestJS HTTP-проксі, який перенаправляє вхідні REST-запити до downstream REST мікросервісів без зміни протоколу. |
| `rpc-api-gateway/` | NestJS шлюз-транслятор: приймає зовнішні HTTP/1.1 REST-запити, перетворює їх у бінарні gRPC-виклики (HTTP/2 + Protobuf) та повертає результат клієнту у форматі JSON. |
| `rest-api-gateway/` (.NET) | Аналогічний проксі-шлюз, реалізований на ASP.NET Core. Використовує багатопотокову модель виконання .NET для вищої пропускної здатності. |
| `rpc-api-gateway/` (.NET) | ASP.NET Core gRPC-шлюз із кодогенерацією клієнта з `.proto` схем. |
| `users-service-rest` / `users-service-rpc` | Пара мікросервісів домену Users, реалізованих з різними протоколами (REST та gRPC). Дозволяє ізольовано виміряти накладні витрати кожного протоколу на одному й тому ж бізнес-логіці. |
| `orders-service-rest` / `orders-service-rpc` | Аналогічна пара для домену Orders. Містить логіку міжсервісного виклику перевірки існування користувача, що моделює реальну залежність між мікросервісами. |
| `k6-tests/rest/test-rest-vus.js` | k6 сценарій для тестування REST шлюзу. Генерує навантаження від 100 до 10 000 VUs та відправляє метрики до `k6_rest` бази InfluxDB. |
| `k6-tests/rpc/test-rpc-vus.js` | k6 сценарій для тестування gRPC шлюзу. Відправляє метрики до `k6_rpc`. |
| `k6-tests/grpc-direct/test-grpc-direct-vus.js` | k6 сценарій прямого gRPC виклику, що оминає шлюз. Дозволяє виміряти чисту продуктивність gRPC без оверхеду проксі. |
| `k6-tests/scripts/compare-results.js` | Допоміжний скрипт для порівняльного аналізу збережених результатів тестів між REST та gRPC сценаріями. |
| `run-tests.sh` | Головний скрипт оркестрації тестів. Приймає параметри `VUS` та режим (`gateway` / `direct`), послідовно запускає k6 і маршрутизує результати до відповідних баз InfluxDB. |
| `fair-compare.sh` (.NET) | Скрипт справедливого порівняння: запускає REST та gRPC тести в однакових умовах для усунення зовнішніх факторів (прогрів JIT, стан кешу). |

---

## Запуск проєкту

### Передумови

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (включає Docker Compose)
- [Git](https://git-scm.com/) + Git Bash (для Windows)
- `curl` — для керування InfluxDB (входить до Git Bash)

### Крок 1 — Клонування репозиторію

```bash
git clone https://github.com/Yur1kk/dotnet-nodejs-grpc-rest-benchmark.git
cd dotnet-nodejs-grpc-rest-benchmark
```

### Крок 2 — Запуск інфраструктури (PostgreSQL, InfluxDB, Grafana)

```bash
cd Cloud-Distributed/deploy-db
docker-compose up -d
```

Після запуску доступні:
- **PostgreSQL** → `localhost:5432`
- **InfluxDB** → `http://localhost:8086`
- **Grafana** → `http://localhost:3006` (логін: `admin` / пароль: `admin`)

### Крок 3 — Ініціалізація баз даних InfluxDB

Якщо ініціалізаційні скрипти не спрацювали автоматично, створіть схеми вручну:

```bash
curl -XPOST "http://localhost:8086/query" --data-urlencode "q=CREATE DATABASE k6_rest"
curl -XPOST "http://localhost:8086/query" --data-urlencode "q=CREATE DATABASE k6_rpc"
curl -XPOST "http://localhost:8086/query" --data-urlencode "q=CREATE DATABASE k6_grpc_direct"
```

### Крок 4 — Наповнення тестовими даними

#### Node.js мікросервіси:
```bash
docker exec -it diploma_users_rest npm run seed
docker exec -it diploma_users_rpc npm run seed
docker exec -it diploma_orders_rest npm run seed
docker exec -it diploma_orders_rpc npm run seed
```

> Для **.NET мікросервісів** міграції PostgreSQL та seed-дані застосовуються автоматично при першому запуску через `EF Core Migrations`.

### Крок 5 — Запуск мікросервісів та шлюзів

#### Node.js екосистема:
```bash
cd Cloud-Distributed
cd deploy-users   && docker-compose up -d --build
cd ../deploy-orders  && docker-compose up -d --build
cd ../deploy-gateway && docker-compose up -d --build
```

#### .NET екосистема:
```bash
cd Cloud-Distributed-CSharp
cd deploy-users   && docker-compose up -d --build
cd ../deploy-orders  && docker-compose up -d --build
cd ../deploy-gateway && docker-compose up -d --build
```

### Крок 6 — Запуск навантажувальних тестів

> **Параметри `run-tests.sh`:**
> - `VUS` — кількість віртуальних користувачів. Якщо не вказано — тести виконуються для **всіх рівнів** (`100` → `500` → `1000` → `2000` → `5000` → `10000`) послідовно.
> - Режим (`gateway` / `direct`) — якщо не вказано — запускаються **всі сценарії** (REST gateway + gRPC gateway + gRPC direct) послідовно.

#### Node.js екосистема

```bash
cd Cloud-Distributed/deploy-gateway
chmod +x run-tests.sh

# Повний прогін — всі сценарії, всі рівні навантаження
./run-tests.sh

# Тільки REST gateway, тільки 500 VUs
VUS=500 ./run-tests.sh gateway

# Тільки gRPC gateway, тільки 1000 VUs
VUS=1000 ./run-tests.sh rpc

# Тільки прямий gRPC виклик (без шлюзу), тільки 2000 VUs
VUS=2000 ./run-tests.sh direct
```

#### .NET екосистема

```bash
cd Cloud-Distributed-CSharp/deploy-gateway
chmod +x run-tests.sh fair-compare.sh

# Повний прогін — всі сценарії, всі рівні навантаження
./run-tests.sh

# Тільки REST gateway, тільки 500 VUs
VUS=500 ./run-tests.sh gateway

# Тільки gRPC gateway, тільки 1000 VUs
VUS=1000 ./run-tests.sh rpc

# Тільки прямий gRPC виклик, тільки 2000 VUs
VUS=2000 ./run-tests.sh direct

# Справедливе порівняння REST vs gRPC в однакових умовах
./fair-compare.sh
```

---


## API — Приклади запитів

### Створення користувача (REST Gateway)

```http
POST /api/users
Content-Type: application/json
```

```json
{
  "name": "Ivan Franko",
  "email": "ivan@test.com",
  "age": 30,
  "role": "user"
}
```

**Відповідь `201 Created`:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Ivan Franko",
  "email": "ivan@test.com",
  "age": 30,
  "role": "user",
  "createdAt": "2026-05-18T12:00:00.000Z"
}
```

### Отримання замовлень (REST)

```http
GET /api/orders?userId=550e8400-e29b-41d4-a716-446655440000
```

**Відповідь `200 OK`:**
```json
{
  "data": [
    {
      "id": "order-uuid-1",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "status": "pending",
      "total": 1500.00,
      "createdAt": "2026-05-18T12:05:00.000Z"
    }
  ],
  "total": 1,
  "page": 1
}
```

---

## Моніторинг та аналіз результатів

Після запуску тестів метрики доступні в **Grafana** за адресою `http://localhost:3006`.

### Ключові метрики на дашбордах

| Метрика | Опис |
|---------|------|
| **RPS (Requests Per Second)** | Пропускна здатність — кількість успішно оброблених запитів за секунду |
| **p95 / p99 Latency** | 95-й та 99-й перцентилі затримки — поведінка системи у найгіршому сценарії |
| **Error Rate** | Частка запитів з помилкою (HTTP 4xx/5xx або gRPC статуси помилок) |
| **CPU / RAM Usage** | Споживання ресурсів контейнерів мікросервісів під навантаженням |

### Структура зберігання метрик у InfluxDB

```
InfluxDB
├── k6_rest/          ← метрики REST Gateway тестів
├── k6_rpc/           ← метрики gRPC Gateway тестів
└── k6_grpc_direct/   ← метрики прямих gRPC викликів (без шлюзу)
```

Ізоляція схем гарантує, що результати різних сценаріїв не змішуються та дані залишаються відтворюваними між запусками.

---

## Відомі проблеми та вирішення

| Проблема | Причина | Рішення |
|----------|---------|---------|
| Змішування результатів різних тестів в InfluxDB | k6 за замовчуванням використовує одну базу даних | Ізоляція через окремі схеми `k6_rest`, `k6_rpc`, `k6_grpc_direct` з автоматичним вибором у скрипті |
| Висока латентність gRPC-трансляції в Node.js шлюзі | Однопотокова event-loop модель NestJS не оптимальна для CPU-bound операцій серіалізації Protobuf під пиком навантаження | Реалізовано аналогічний шлюз на .NET 8 з багатопотоковою моделлю виконання |
| Недоступність портів після деплою на GCP | Брандмауер VPC GCP блокує вхідний трафік за замовчуванням | Налаштовано правила VPC Firewall для відкриття TCP-портів `3000–3006` та `50051` (gRPC) |
| Некоректні значення RPS у Grafana | Grafana застосовує `mean()` до агрегованих точок — «середнє від середніх» | Використано запит `SELECT sum("value") / 5` з `GROUP BY time(5s)` для отримання математично коректного RPS |