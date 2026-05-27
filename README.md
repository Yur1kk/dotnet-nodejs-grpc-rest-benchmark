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
|-----------|------------|
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
│   │   ├── .env                              # Локальні змінні хостів
│   │   ├── .env.example                      # Шаблон хмарних/локальних змінних
│   │   ├── run-tests.sh                      # Головний скрипт автоматизації тестів
│   │   ├── proto/                            # Protobuf-схеми для шлюзів
│   │   ├── rest-api-gateway/                 # NestJS REST-шлюз (HTTP проксі)
│   │   │   ├── .env                          # Локальні змінні порту та downstream URL
│   │   │   ├── .env.example                  # Шаблон локальних змінних
│   │   │   ├── src/
│   │   │   ├── Dockerfile
│   │   │   └── package.json
│   │   ├── rpc-api-gateway/                  # NestJS gRPC-шлюз (REST → gRPC трансляція)
│   │   │   ├── .env
│   │   │   ├── .env.example
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
│   │   ├── .env                              # Змінні для зв'язку з БД
│   │   ├── .env.example                      # Шаблон змінних
│   │   ├── proto/
│   │   ├── users-service-rest/               # NestJS REST мікросервіс користувачів
│   │   │   ├── .env                          # Локальні змінні БД (localhost)
│   │   │   ├── .env.example                  # Шаблон локальних змінних БД
│   │   │   ├── src/
│   │   │   ├── Dockerfile
│   │   │   └── package.json
│   │   └── users-service-rpc/                # NestJS gRPC мікросервіс користувачів
│   │       ├── .env
│   │       ├── .env.example
│   │       ├── src/
│   │       ├── Dockerfile
│   │       └── package.json
│   │
│   └── deploy-orders/                        # Мікросервіси домену Orders
│       ├── docker-compose.yml
│       ├── .env
│       ├── .env.example
│       ├── proto/
│       ├── orders-service-rest/              # NestJS REST мікросервіс замовлень
│       │   ├── .env
│       │   ├── .env.example
│       │   ├── src/
│       │   ├── Dockerfile
│       │   └── package.json
│       └── orders-service-rpc/               # NestJS gRPC мікросервіс замовлень
│           ├── .env
│           ├── .env.example
│           ├── src/
│           ├── Dockerfile
│           └── package.json
│
└── Cloud-Distributed-CSharp/                 # .NET 8 / ASP.NET Core екосистема
    ├── pack.ps1
    │
    ├── deploy-gateway/                        # .NET API-шлюзи та тести
    │   ├── docker-compose.yml
    │   ├── .env
    │   ├── .env.example
    │   ├── run-tests.sh                       # Скрипт автоматизації тестів (.NET)
    │   ├── fair-compare.sh                    # Скрипт чесного порівняння REST vs gRPC
    │   ├── proto/
    │   ├── rest-api-gateway/                  # ASP.NET Core REST-шлюз
    │   │   ├── .env
    │   │   ├── .env.example
    │   │   ├── Program.cs
    │   │   ├── RestGateway.csproj
    │   │   └── Dockerfile
    │   ├── rpc-api-gateway/                   # ASP.NET Core gRPC-шлюз
    │   │   ├── .env
    │   │   ├── .env.example
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
    │   ├── .env
    │   ├── .env.example
    │   ├── users-service-rest/                # ASP.NET Core REST мікросервіс
    │   │   ├── .env
    │   │   ├── .env.example
    │   │   ├── Program.cs
    │   │   └── Users.Rest.csproj
    │   └── users-service-rpc/                 # ASP.NET Core gRPC мікросервіс
    │       ├── .env
    │       ├── .env.example
    │       ├── Program.cs
    │       └── Users.Rpc.csproj
    │
    └── deploy-orders/                         # .NET мікросервіси домену Orders
        ├── docker-compose.yml
        ├── .env
        ├── .env.example
        ├── orders-service-rest/               # ASP.NET Core REST мікросервіс
        │   ├── .env
        │   ├── .env.example
        │   ├── Program.cs
        │   └── Orders.Rest.csproj
        └── orders-service-rpc/                # ASP.NET Core gRPC мікросервіс
            ├── .env
            ├── .env.example
            ├── Program.cs
            └── Orders.Rpc.csproj
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

## Карта портів

### Node.js екосистема

| Сервіс | Порт | Протокол |
|--------|------|----------|
| REST API Gateway | `3000` | HTTP |
| gRPC API Gateway | `3001` | HTTP (REST→gRPC трансляція) |
| Users Service REST | `3002` | HTTP |
| Users Service gRPC | `3003` (HTTP) / `5003` (gRPC) | HTTP + gRPC |
| Orders Service REST | `3004` | HTTP |
| Orders Service gRPC | `3005` (HTTP) / `5005` (gRPC) | HTTP + gRPC |

### .NET екосистема

| Сервіс | Порт | Протокол |
|--------|------|----------|
| REST API Gateway | `3010` | HTTP |
| gRPC API Gateway | `3011` | HTTP (REST→gRPC трансляція) |
| Users Service REST | `3012` | HTTP |
| Users Service gRPC | `5013` | gRPC |
| Orders Service REST | `3014` | HTTP |
| Orders Service gRPC | `5015` | gRPC |

### Інфраструктура

| Сервіс | Порт |
|--------|------|
| PostgreSQL | `5432` |
| InfluxDB | `8086` |
| Grafana | `3006` |

---

## Передумови

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (включає Docker Compose)
- [Git](https://git-scm.com/) + **Git Bash** (для Windows — встановлюється разом з Git)
- `curl` — для керування InfluxDB (входить до Git Bash)

---

## Запуск проєкту — ЛОКАЛЬНО (Windows / macOS / Linux)

> **Всі команди нижче виконуються в Git Bash (Windows) або терміналі (macOS/Linux).**

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

Дочекайтеся повного старту. Перевірте:
```bash
docker ps --filter "name=diploma_" --format "table {{.Names}}\t{{.Status}}"
```

> **Не переходьте до наступних кроків**, поки `diploma_postgres` не покаже статус `Up ... (healthy)`. Це може зайняти 30–60 секунд.

Після запуску доступні (**3 контейнери**):
- **PostgreSQL** → `localhost:5432`
- **InfluxDB** → `http://localhost:8086`
- **Grafana** → `http://localhost:3006` (анонімний доступ, без логіну)

### Крок 3 — Ініціалізація баз даних InfluxDB

Якщо ініціалізаційні скрипти не спрацювали автоматично при першому запуску, створіть бази вручну:

```bash
curl -XPOST "http://localhost:8086/query" --data-urlencode "q=CREATE DATABASE k6_rest"
curl -XPOST "http://localhost:8086/query" --data-urlencode "q=CREATE DATABASE k6_rpc"
curl -XPOST "http://localhost:8086/query" --data-urlencode "q=CREATE DATABASE k6_grpc_direct"
curl -XPOST "http://localhost:8086/query" --data-urlencode "q=CREATE DATABASE k6_rest_cs"
curl -XPOST "http://localhost:8086/query" --data-urlencode "q=CREATE DATABASE k6_rpc_cs"
```

### Крок 4 — Запуск, тестування та зупинка екосистем

> **Рекомендація:** Для чистоти результатів бенчмарку тестуйте **кожну екосистему окремо**. Одночасний запуск Node.js та .NET контейнерів створює конкуренцію за CPU та RAM, що спотворює результати. Нижче описано послідовний підхід: спочатку Node.js, потім .NET.

> **Параметри `run-tests.sh`:**
> - `VUS` — кількість віртуальних користувачів. Якщо не вказано — тести виконуються для **всіх рівнів** (`100` → `200` → `500` → `1000` → `2000` → `5000` → `10000`) послідовно.
> - Режим (`gateway` / `direct` / `all`) — якщо не вказано — запускаються **всі сценарії** послідовно.

---

#### 4A — Node.js екосистема

> **Рекомендований кросплатформний спосіб:** Щоб не писати префікси змінних (які не працюють на Windows у PowerShell/CMD), створіть `.env` файли з налаштуваннями для локального запуску:
> ```bash
> # 1. Створюємо локальні .env файли (копіюємо з шаблонів, де вже прописано host.docker.internal)
> cp Cloud-Distributed/deploy-users/.env.example Cloud-Distributed/deploy-users/.env
> cp Cloud-Distributed/deploy-orders/.env.example Cloud-Distributed/deploy-orders/.env
> cp Cloud-Distributed/deploy-gateway/.env.example Cloud-Distributed/deploy-gateway/.env
> ```

**Запуск:**
```bash
cd ../../  # повертаємось до кореня репозиторію

# Users мікросервіси
cd Cloud-Distributed/deploy-users
docker-compose up -d --build

# Orders мікросервіси
cd ../deploy-orders
docker-compose up -d --build

# API шлюзи
cd ../deploy-gateway
docker-compose up -d --build
```

Дочекайтеся запуску (1–3 хвилини для білду при першому запуску). Очікувана кількість: **9 контейнерів** (3 інфра + 4 мікросервіси + 2 шлюзи).

> При першому запуску кожен Node.js контейнер автоматично виконує синхронізацію схеми через `npx prisma db push` (створення та оновлення таблиць у PostgreSQL у разі відсутності міграцій).

**Seed (наповнення тестовими даними):**
```bash
docker exec -it diploma_users_rest npm run seed
docker exec -it diploma_users_rpc npm run seed
docker exec -it diploma_orders_rest npm run seed
docker exec -it diploma_orders_rpc npm run seed
```

**Перевірка:**
```bash
curl -s http://localhost:3000/api/users?page=1\&limit=1 | head -c 200
curl -s http://localhost:3001/api/users?page=1\&limit=1 | head -c 200
```

**Тести:**
```bash
cd Cloud-Distributed/deploy-gateway
chmod +x run-tests.sh

# Повний прогін — всі сценарії, всі рівні навантаження
./run-tests.sh

# Або вибірково:
VUS=500 ./run-tests.sh gateway    # тільки REST+gRPC gateway, 500 VUs
VUS=1000 ./run-tests.sh direct    # тільки прямі виклики, 1000 VUs
```

**Зупинка Node.js контейнерів (перед запуском .NET):**
```bash
cd Cloud-Distributed/deploy-gateway && docker-compose down
cd ../deploy-orders                && docker-compose down
cd ../deploy-users                 && docker-compose down
```

> Інфраструктура (`deploy-db`) залишається працювати — PostgreSQL, InfluxDB та Grafana потрібні і для .NET.

---

#### 4B — .NET екосистема

> .NET мікросервіси використовують Docker-мережу `diploma_default` (створюється при запуску `deploy-db`) та звертаються до PostgreSQL через hostname `postgres`. Seed-дані застосовуються автоматично при першому запуску через EF Core Migrations.

**Запуск:**
```bash
cd ../../  # повертаємось до кореня репозиторію

# Users мікросервіси (.NET)
cd Cloud-Distributed-CSharp/deploy-users
docker-compose up -d --build

# Orders мікросервіси (.NET)
cd ../deploy-orders
docker-compose up -d --build

# API шлюзи (.NET)
cd ../deploy-gateway
docker-compose up -d --build
```

Очікувана кількість: **9 контейнерів** (3 інфра + 4 мікросервіси + 2 шлюзи).

**Перевірка:**
```bash
curl -s http://localhost:3010/api/users?page=1\&limit=1 | head -c 200
curl -s http://localhost:3011/api/users?page=1\&limit=1 | head -c 200
```

**Тести:**
```bash
cd Cloud-Distributed-CSharp/deploy-gateway
chmod +x run-tests.sh fair-compare.sh

# Повний прогін
./run-tests.sh

# Або вибірково:
VUS=500 ./run-tests.sh gateway
VUS=1000 ./run-tests.sh direct

# Справедливе порівняння REST vs gRPC в однакових умовах
./fair-compare.sh
```

### Крок 5 — Перегляд результатів

Результати доступні у **Grafana**: http://localhost:3006


---

## Запуск проєкту — ХМАРА (GCP)

> Для хмарного деплою використовується **Google Cloud Platform** з розподілом по окремих VM:

### Архітектура GCP

| VM | Внутрішня IP | Компоненти |
|----|-------------|------------|
| **db-vm** | `10.186.0.2` | PostgreSQL, InfluxDB, Grafana |
| **orders-vm** | `10.186.0.4` | Orders мікросервіси (Node.js + .NET) |
| **users-vm** | `10.186.0.6` | Users мікросервіси (Node.js + .NET) |
| **gateway-vm** | будь-яка | API шлюзи + k6 тести |

> **IP-адреси вище — приклад конкретного середовища.** Якщо ви створюєте власні VM з іншими адресами:
> 1. Створіть файли `.env` на основі `.env.example` у відповідних папках деплою та вкажіть туди **свої внутрішні IP**:
>    - **Для Node.js (`Cloud-Distributed/`):**
>      - `deploy-users/` ➔ скопіюйте `.env.example` в `.env`, вкажіть `DB_HOST` (IP вашої db-vm)
>      - `deploy-orders/` ➔ скопіюйте `.env.example` в `.env`, вкажіть `DB_HOST` та `USERS_HOST` (IP вашої users-vm)
>      - `deploy-gateway/` ➔ скопіюйте `.env.example` в `.env`, вкажіть `USERS_HOST` та `ORDERS_HOST` (IP вашої orders-vm)
>    - **Для .NET (`Cloud-Distributed-CSharp/`):**
>      - `deploy-users/` ➔ скопіюйте `.env.example` в `.env`, вкажіть `DB_HOST`
>      - `deploy-orders/` ➔ скопіюйте `.env.example` в `.env`, вкажіть `DB_HOST`
>      - `deploy-gateway/` ➔ скопіюйте `.env.example` в `.env`, вкажіть `USERS_HOST` та `ORDERS_HOST`
> 2. Також оновіть IP-адреси у скриптах запуску тестів k6:
>    - `Cloud-Distributed/deploy-gateway/run-tests.sh` — блок `ENV="cloud"` (рядки з IP)
>    - `Cloud-Distributed-CSharp/deploy-gateway/run-tests.sh` — аналогічно (блок `ENV="cloud"`)

### Крок 1 — Підготовка VM

На кожній VM встановіть Docker:
```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose
sudo usermod -aG docker $USER
# Перелогіньтесь для застосування групи docker
```

### Крок 2 — Клонування репозиторію (на кожній VM)

```bash
git clone https://github.com/Yur1kk/dotnet-nodejs-grpc-rest-benchmark.git
cd dotnet-nodejs-grpc-rest-benchmark
```

### Крок 3 — Запуск інфраструктури (db-vm: 10.186.0.2)

```bash
cd Cloud-Distributed/deploy-db
sudo docker-compose up -d
```

> Дочекайтеся, поки `diploma_postgres` покаже статус `(healthy)`:
> ```bash
> sudo docker ps --format "table {{.Names}}\t{{.Status}}"
> ```

Перевірте та створіть бази InfluxDB (якщо потрібно):
```bash
curl -XPOST "http://localhost:8086/query" --data-urlencode "q=CREATE DATABASE k6_rest"
curl -XPOST "http://localhost:8086/query" --data-urlencode "q=CREATE DATABASE k6_rpc"
curl -XPOST "http://localhost:8086/query" --data-urlencode "q=CREATE DATABASE k6_grpc_direct"
curl -XPOST "http://localhost:8086/query" --data-urlencode "q=CREATE DATABASE k6_rest_cs"
curl -XPOST "http://localhost:8086/query" --data-urlencode "q=CREATE DATABASE k6_rpc_cs"
```

### Крок 4 — Запуск Users мікросервісів (users-vm: 10.186.0.6)

```bash
# Node.js
cd Cloud-Distributed/deploy-users
sudo docker-compose up -d --build

# .NET (потрібна мережа diploma_default — створіть вручну, бо deploy-db на іншій VM)
sudo docker network create diploma_default 2>/dev/null || true
cd ../../Cloud-Distributed-CSharp/deploy-users
sudo docker-compose up -d --build
```

> **Примітка:** При першому запуску контейнерів Node.js автоматично виконується синхронізація схеми через `npx prisma db push` для створення необхідних таблиць в PostgreSQL.

### Крок 5 — Запуск Orders мікросервісів (orders-vm: 10.186.0.4)

```bash
# Node.js
cd Cloud-Distributed/deploy-orders
sudo docker-compose up -d --build

# .NET
sudo docker network create diploma_default 2>/dev/null || true
cd ../../Cloud-Distributed-CSharp/deploy-orders
sudo docker-compose up -d --build
```

> **Примітка:** При першому запуску контейнерів Node.js автоматично виконується синхронізація схеми через `npx prisma db push` для створення необхідних таблиць в PostgreSQL.

### Крок 6 — Наповнення тестовими даними (seed)

На **users-vm**:
```bash
sudo docker exec -it diploma_users_rest npm run seed
sudo docker exec -it diploma_users_rpc npm run seed
```

На **orders-vm**:
```bash
sudo docker exec -it diploma_orders_rest npm run seed
sudo docker exec -it diploma_orders_rpc npm run seed
```

> .NET мікросервіси виконують seed автоматично при старті.

### Крок 7 — Запуск шлюзів та тестів (gateway-vm)

```bash
# Node.js шлюзи
cd Cloud-Distributed/deploy-gateway
sudo docker-compose up -d --build

# .NET шлюзи
sudo docker network create diploma_default 2>/dev/null || true
cd ../../Cloud-Distributed-CSharp/deploy-gateway
sudo docker-compose up -d --build
```

Запуск тестів:
```bash
# Node.js
cd Cloud-Distributed/deploy-gateway
chmod +x run-tests.sh
sudo ./run-tests.sh

# .NET
cd ../../Cloud-Distributed-CSharp/deploy-gateway
chmod +x run-tests.sh fair-compare.sh
sudo ./run-tests.sh
```

> Скрипт `run-tests.sh` **автоматично** визначає середовище (local/cloud) за IP-адресою та використовує відповідні URL-адреси.

### Крок 8 — Налаштування VPC Firewall

Для доступу до Grafana та портів мікросервісів ззовні:
```bash
gcloud compute firewall-rules create allow-diploma-ports \
  --allow tcp:3000-3015,tcp:5003,tcp:5005,tcp:5013,tcp:5015,tcp:3006,tcp:8086 \
  --source-ranges 0.0.0.0/0 \
  --description "Diploma benchmark ports"
```

---

## Очищення та запуск з нуля

### Повне очищення (видалення всіх контейнерів, образів та даних)

```bash
# Зупинити та видалити всі контейнери проєкту
cd Cloud-Distributed/deploy-gateway  && docker-compose down --rmi all -v 2>/dev/null
cd ../deploy-orders                  && docker-compose down --rmi all -v 2>/dev/null
cd ../deploy-users                   && docker-compose down --rmi all -v 2>/dev/null
cd ../deploy-db                      && docker-compose down --rmi all -v 2>/dev/null

cd ../../Cloud-Distributed-CSharp/deploy-gateway && docker-compose down --rmi all -v 2>/dev/null
cd ../deploy-orders                              && docker-compose down --rmi all -v 2>/dev/null
cd ../deploy-users                               && docker-compose down --rmi all -v 2>/dev/null

# Видалити Docker мережу
docker network rm diploma_default 2>/dev/null

# Очистити невикористані ресурси Docker
docker system prune -af --volumes
```

### Швидке очищення (зберігає образи, видаляє лише контейнери та дані)

```bash
# Зупинити всі контейнери проєкту
docker stop $(docker ps -q --filter "name=diploma_") 2>/dev/null
docker rm $(docker ps -aq --filter "name=diploma_") 2>/dev/null

# Видалити volumes з даними PostgreSQL та InfluxDB
cd Cloud-Distributed/deploy-db
docker-compose down -v
```

> Після очищення повторіть кроки починаючи з **Кроку 2**.

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
├── k6_rest/          ← метрики REST Gateway тестів (Node.js)
├── k6_rpc/           ← метрики gRPC Gateway тестів (Node.js)
├── k6_grpc_direct/   ← метрики прямих gRPC викликів (без шлюзу)
├── k6_rest_cs/       ← метрики REST Gateway тестів (.NET)
└── k6_rpc_cs/        ← метрики gRPC Gateway тестів (.NET)
```

Ізоляція схем гарантує, що результати різних сценаріїв не змішуються та дані залишаються відтворюваними між запусками.

---

## Відомі проблеми та вирішення

| Проблема | Причина | Рішення |
|----------|---------|---------|
| `npm run seed` завершується з помилкою | Контейнер ще не готовий або БД не ініціалізована | Дочекайтесь повного запуску контейнера (`docker logs diploma_users_rest`), перевірте що PostgreSQL доступний |
| Змішування результатів різних тестів в InfluxDB | k6 за замовчуванням використовує одну базу даних | Ізоляція через окремі схеми `k6_rest`, `k6_rpc`, `k6_grpc_direct` з автоматичним вибором у скрипті |
| Висока латентність gRPC-трансляції в Node.js шлюзі | Однопотокова event-loop модель NestJS не оптимальна для CPU-bound операцій серіалізації Protobuf під пиком навантаження | Реалізовано аналогічний шлюз на .NET 8 з багатопотоковою моделлю виконання |
| Недоступність портів після деплою на GCP | Брандмауер VPC GCP блокує вхідний трафік за замовчуванням | Налаштовано правила VPC Firewall для відкриття TCP-портів `3000–3015`, `5003`, `5005`, `5013`, `5015` |
| `.NET` контейнери не знаходять PostgreSQL | Мережа `diploma_default` ще не створена | Спочатку запустіть `deploy-db` (створює мережу), або створіть вручну: `docker network create diploma_default` |
| Node.js мікросервіси не з'єднуються з PostgreSQL локально | За замовчуванням `DB_HOST=10.186.0.2` (GCP IP) | Локально передайте `DB_HOST=host.docker.internal` при запуску `docker-compose` |