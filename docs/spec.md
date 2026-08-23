# Event Ticket Reservation App - Specification

## 1. Overview

新しいバックエンド言語・フレームワークを学習するときのリファレンス実装として利用できる、
イベント・チケット予約サービスを作成する。

今回の主目的は NestJS の主要機能を一通り実装し、API 開発に必要な構成・設計・認証・認可・DB 操作・トランザクション・テスト・運用周りを学習すること。

フロントエンドは API の動作確認を分かりやすくするための簡易 UI として実装する。

---

## 2. Goals

- NestJS の基本構造を理解する
- Module / Controller / Service / Provider の責務を理解する
- DTO と Validation を実装する
- メールアドレス + パスワードによる認証を実装する
- JWT による API 認証を実装する
- Role ベースの認可を実装する
- Prisma + PostgreSQL を利用する
- DB Transaction を実装する
- 同時予約時の競合を考慮する
- REST API の設計を経験する
- Swagger / OpenAPI を導入する
- Unit Test / Integration Test / E2E Test を実装する
- Docker を利用したローカル開発環境を構築する
- AWS へのデプロイを想定した構成にする

---

## 3. Non Goals

初期実装では以下は対象外とする。

- 実際の決済
- OAuth / Social Login
- モバイルアプリ
- 複雑な座席指定
- QR コードによる入場管理
- メール送信
- Push 通知
- マイクロサービス化
- Event Sourcing
- CQRS の本格導入
- Redis
- Kafka / SQS などの非同期メッセージング
- Kubernetes

必要に応じて後から追加する。

---

# 4. Technology Stack

## Frontend

- TypeScript
- React
- Vite
- React Router
- API Client
  - fetch または Axios
- UI は最低限
- 状態管理ライブラリは原則不要
  - 必要になった場合のみ導入

## Backend

- TypeScript
- Node.js
- NestJS
- REST API
- Prisma
- PostgreSQL
- JWT Authentication
- Swagger / OpenAPI

## Development

- Docker
- Docker Compose
- ESLint
- Prettier
- pnpm
- pnpm workspace
- `.env`

本リポジトリは pnpm workspace を利用したモノレポ構成とする。

## Infrastructure

- AWS
- Terraform
- ECR
- ECS Fargate
- ALB
- RDS PostgreSQL
- S3
- CloudFront
- CloudWatch Logs
- Secrets Manager または SSM Parameter Store

---

# 5. Domain Model

最低限以下の Entity を持つ。

```text
User
 ├─ Reservation
 │    └─ Ticket
 │
Event
 ├─ Reservation
 └─ Ticket
```

---

# 6. Entity Definitions

## 6.1 User

ユーザー情報。

### Fields

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary Key |
| email | string | ログイン用メールアドレス |
| passwordHash | string | ハッシュ化済みパスワード |
| name | string | 表示名 |
| role | enum | USER / ADMIN |
| createdAt | datetime | 作成日時 |
| updatedAt | datetime | 更新日時 |

### Constraints

- email は UNIQUE
- password の平文保存は禁止

---

## 6.2 Event

イベント情報。

### Fields

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary Key |
| title | string | イベント名 |
| description | text | 説明 |
| venue | string | 開催場所 |
| startsAt | datetime | 開始日時 |
| endsAt | datetime | 終了日時 |
| capacity | integer | 最大人数 |
| reservedCount | integer | 現在の予約数 |
| status | enum | DRAFT / PUBLISHED / CLOSED / CANCELLED |
| createdBy | UUID | 作成した Admin User |
| createdAt | datetime | 作成日時 |
| updatedAt | datetime | 更新日時 |

### Constraints

- capacity > 0
- reservedCount >= 0
- reservedCount <= capacity
- startsAt < endsAt

---

## 6.3 Reservation

ユーザーによるイベント予約。

### Fields

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary Key |
| userId | UUID | User |
| eventId | UUID | Event |
| status | enum | RESERVED / CANCELLED |
| reservedAt | datetime | 予約日時 |
| cancelledAt | datetime nullable | キャンセル日時 |
| createdAt | datetime | 作成日時 |
| updatedAt | datetime | 更新日時 |

### Constraints

同一ユーザーが同一イベントへ複数予約できない。

UNIQUE:

```text
(userId, eventId)
```

---

## 6.4 Ticket

予約成立後に発行されるチケット。

### Fields

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary Key |
| reservationId | UUID | Reservation |
| ticketNumber | string | チケット番号 |
| status | enum | VALID / CANCELLED |
| issuedAt | datetime | 発行日時 |
| createdAt | datetime | 作成日時 |

### Constraints

- reservationId は UNIQUE
- ticketNumber は UNIQUE

---

# 7. Authentication

## 7.1 Sign Up

```http
POST /auth/signup
```

### Request

```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "Test User"
}
```

### Processing

1. DTO Validation
2. email 重複確認
3. Password Hash
4. User 作成
5. JWT 発行

### Response

```json
{
  "accessToken": "...",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "name": "Test User",
    "role": "USER"
  }
}
```

---

## 7.2 Login

```http
POST /auth/login
```

### Request

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Processing

1. User 検索
2. Password Verify
3. JWT 発行

---

## 7.3 JWT

JWT を Authorization Header で送信する。

```http
Authorization: Bearer <token>
```

JWT Payload の例:

```json
{
  "sub": "user-id",
  "role": "USER"
}
```

初期実装では Access Token のみでよい。

Refresh Token は拡張機能として後から追加可能。

---

# 8. Authorization

Role:

```text
USER
ADMIN
```

ADMIN のみ実行可能:

- Event 作成
- Event 更新
- Event 削除
- Event 公開
- Event キャンセル

USER:

- Event 閲覧
- Event 予約
- 自分の予約一覧確認
- 自分の予約キャンセル

NestJS Guard + Custom Decorator を利用する。

例:

```ts
@Roles(Role.ADMIN)
```

---

# 9. API Specification

## Auth

```text
POST /auth/signup
POST /auth/login
GET  /auth/me
```

---

## Events

```text
GET    /events
GET    /events/:id

POST   /events
PATCH  /events/:id
DELETE /events/:id
```

POST / PATCH / DELETE は ADMIN のみ。

---

## Event Search

```http
GET /events?page=1&limit=20
```

検索条件:

```text
keyword
status
startsFrom
startsTo
```

例:

```http
GET /events?keyword=nestjs&status=PUBLISHED&page=1&limit=20
```

---

## Reservations

予約:

```text
POST /events/:eventId/reservations
```

自分の予約一覧:

```text
GET /me/reservations
```

予約詳細:

```text
GET /me/reservations/:id
```

キャンセル:

```text
DELETE /me/reservations/:id
```

---

# 10. Reservation Transaction

本アプリで最も重要な学習項目の一つ。

## Reservation Flow

```text
BEGIN TRANSACTION

1. Event を取得
2. Event.status == PUBLISHED を確認
3. 残席を確認
4. 重複予約を確認
5. Reservation INSERT
6. Ticket INSERT
7. Event.reservedCount UPDATE

COMMIT
```

途中で失敗した場合:

```text
ROLLBACK
```

Prisma の `$transaction` を利用する。

---

# 11. Concurrency Control

以下の状況を正しく処理する。

```text
Event capacity = 100
reservedCount = 99
```

User A と User B が同時に予約:

```text
A ── reserve ──┐
               ├─ remaining = 1
B ── reserve ──┘
```

2 人とも予約成功して、

```text
reservedCount = 101
```

になってはいけない。

## Recommended Approach

初期実装では DB の Atomic Update を利用する。

概念:

```sql
UPDATE events
SET reserved_count = reserved_count + 1
WHERE
  id = ?
  AND reserved_count < capacity;
```

更新件数が 0 の場合:

```text
SOLD_OUT
```

と判断する。

必要に応じて Prisma の Transaction Isolation Level も検討する。

学習目的として以下について README またはコメントで整理する。

- Lost Update
- Race Condition
- Transaction Isolation Level
- Optimistic Lock
- Pessimistic Lock
- Atomic Update

---

# 12. Reservation Cancel Transaction

キャンセル時も Transaction を利用する。

```text
BEGIN

1. Reservation 取得
2. 所有者確認
3. Reservation.status = CANCELLED
4. Ticket.status = CANCELLED
5. Event.reservedCount -= 1

COMMIT
```

---

# 13. Error Handling

共通 Error Response:

```json
{
  "statusCode": 400,
  "code": "EVENT_SOLD_OUT",
  "message": "Event is sold out",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "path": "/events/xxx/reservations"
}
```

代表的な Error Code:

```text
INVALID_CREDENTIALS
EMAIL_ALREADY_EXISTS
EVENT_NOT_FOUND
EVENT_NOT_PUBLISHED
EVENT_SOLD_OUT
ALREADY_RESERVED
RESERVATION_NOT_FOUND
RESERVATION_ALREADY_CANCELLED
FORBIDDEN
UNAUTHORIZED
VALIDATION_ERROR
```

NestJS ExceptionFilter の利用を検討する。

---

# 14. Validation

class-validator / class-transformer を利用する。

Global ValidationPipe を設定する。

推奨設定:

```ts
new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
})
```

例:

```text
email
- IsEmail

password
- MinLength

capacity
- IsInt
- Min(1)
```

---

# 15. NestJS Modules

推奨構成:

```text
src/
├── main.ts
├── app.module.ts
│
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── dto/
│   ├── guards/
│   ├── decorators/
│   └── strategies/
│
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── dto/
│
├── events/
│   ├── events.module.ts
│   ├── events.controller.ts
│   ├── events.service.ts
│   └── dto/
│
├── reservations/
│   ├── reservations.module.ts
│   ├── reservations.controller.ts
│   ├── reservations.service.ts
│   └── dto/
│
├── tickets/
│   ├── tickets.module.ts
│   ├── tickets.service.ts
│   └── dto/
│
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
│
├── common/
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   └── types/
│
└── config/
```

Feature-based structure とする。

---

# 16. NestJS Features To Learn

最低限以下を一度は利用する。

## Module

```text
@Module
```

## Controller

```text
@Controller
@Get
@Post
@Patch
@Delete
```

## Provider / DI

```text
@Injectable
constructor(private readonly service: Service)
```

## DTO

```text
CreateEventDto
UpdateEventDto
CreateReservationDto
```

## ValidationPipe

Global Pipe として利用。

## Guard

```text
JwtAuthGuard
RolesGuard
```

## Custom Decorator

```text
@CurrentUser()
@Roles()
```

## Exception Filter

共通 Error Response の生成。

## Interceptor

学習目的として Logging または Response Transform 用に一つ実装する。

## Middleware

Request ID の付与など、簡単な用途で一つ実装する。

---

# 17. Prisma

Prisma は開発時のみではなく、本番環境でも NestJS から PostgreSQL へアクセスするための ORM / Database Client として利用する。

構成イメージ:

```text
NestJS
  ↓
Prisma Client
  ↓
PostgreSQL
```

Prisma Schema で以下を定義する。

```text
User
Event
Reservation
Ticket
```

利用機能:

- Prisma Client
- Migration
- Relation
- Unique Constraint
- Enum
- Transaction
- Pagination
- Filtering
- Sorting

## Development Migration

開発環境では schema.prisma を変更した後、migration を生成してローカル PostgreSQL へ適用する。

```text
schema.prisma
    ↓
prisma migrate dev
    ↓
migration SQL
    ↓
Local PostgreSQL
```

migration ファイルは Git 管理する。

## Production Migration

本番環境では開発時に生成済みの migration を適用する。

```text
CI/CD
  ↓
prisma migrate deploy
  ↓
RDS PostgreSQL
  ↓
ECS Deploy
```

本番環境で `prisma migrate dev` は実行しない。

Prisma Client の生成も Build / Deploy のフローに含める。

例:

```text
pnpm prisma generate
pnpm prisma migrate deploy
```

実際の CI/CD では migration 適用と ECS デプロイの順序を明示的に管理する。

---

# 18. Database

PostgreSQL を使用する。

Local:

```text
Docker Compose PostgreSQL
```

AWS:

```text
Amazon RDS for PostgreSQL
```

---

# 19. Frontend

API 学習が目的なので最低限とする。

画面:

```text
/login
/signup
/events
/events/:id
/my/reservations
/admin/events
/admin/events/new
```

## Login

```text
Email
Password
Login Button
```

## Event List

```text
Event Name
Date
Venue
Remaining Seats
```

## Event Detail

```text
Event Information
Reserve Button
```

## My Reservations

```text
Reservation
Ticket Number
Cancel Button
```

## Admin

```text
Event Create
Event Edit
Event Delete
```

デザインには時間をかけない。

---

# 20. Swagger

NestJS Swagger を導入する。

```text
/docs
```

で API Documentation を表示。

以下を記載する。

- Request DTO
- Response
- Authentication
- Error Response
- Status Code

Swagger UI から API 動作確認可能にする。

---

# 21. Logging

NestJS Logger または構造化 Logger を利用。

最低限記録するもの:

```text
requestId
method
path
statusCode
duration
userId
```

Password / JWT はログ出力禁止。

---

# 22. Testing

## Unit Test

対象:

```text
AuthService
EventsService
ReservationsService
```

特に ReservationsService の Business Logic を重点的にテストする。

---

## Integration Test

PostgreSQL を利用して、

```text
Prisma + Service
```

の組み合わせをテストする。

---

## E2E Test

代表シナリオ:

### Authentication

```text
signup
login
auth/me
```

### Reservation

```text
Admin Create Event
User Signup
User Login
Event List
Reserve Event
Ticket Issued
Reservation List
Cancel Reservation
```

### Sold Out

```text
capacity = 1

User A Reserve
User B Reserve

User B => EVENT_SOLD_OUT
```

---

# 23. Local Development

Docker Compose を利用する。

想定構成:

```text
┌──────────────┐
│ React / Vite │
│ localhost    │
└──────┬───────┘
       │
       │ HTTP
       ▼
┌──────────────┐
│ NestJS       │
│ Docker       │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ PostgreSQL   │
│ Docker       │
└──────────────┘
```

Docker Compose:

```text
web
api
postgres
```

モノレポ内では以下に対応する。

```text
web  -> apps/web
api  -> apps/api
```

ただし Frontend は Vite を Host OS 上で直接実行してもよい。

---

# 24. AWS Architecture

本番想定構成:

```text
                         Internet
                            │
                            ▼
                    ┌──────────────┐
                    │  CloudFront  │
                    └──────┬───────┘
                           │
             ┌─────────────┴─────────────┐
             │                           │
             ▼                           ▼
       ┌──────────┐                ┌───────────┐
       │    S3    │                │    ALB    │
       │ React    │                └─────┬─────┘
       │ Static   │                      │
       └──────────┘                      ▼
                                  ┌──────────────┐
                                  │ ECS Fargate  │
                                  │ NestJS       │
                                  └──────┬───────┘
                                         │
                                         ▼
                                  ┌──────────────┐
                                  │ RDS          │
                                  │ PostgreSQL   │
                                  └──────────────┘
```

---

# 25. Frontend Infrastructure

Vite React は Static Build なので S3 に配置する。

```text
npm run build

dist/
```

を S3 へ Upload。

構成:

```text
CloudFront
   ↓
S3
   ↓
React
```

S3 Bucket は Public Access を無効化する。

CloudFront Origin Access Control を利用する。

SPA のため、

```text
/events/xxx
```

などを直接開いた場合でも `index.html` へフォールバックする設定を行う。

---

# 26. Backend Infrastructure

NestJS は Docker Image としてビルドする。

```text
Dockerfile
   ↓
ECR
   ↓
ECS Fargate
```

Internet からの通信:

```text
Client
 ↓
ALB
 ↓
ECS Fargate
```

ECS Task は Private Subnet に配置する。

---

# 27. Database Infrastructure

Amazon RDS PostgreSQL。

```text
ECS
 ↓
RDS PostgreSQL
```

RDS は Private Subnet に配置。

Public Access:

```text
disabled
```

Security Group で ECS からのみ PostgreSQL port を許可する。

---

# 28. AWS Network

推奨構成:

```text
VPC

├── Public Subnet
│   └── ALB
│
└── Private Subnet
    ├── ECS Fargate
    └── RDS PostgreSQL
```

学習用途・コスト削減を優先する場合、NAT Gateway の扱いには注意する。

NAT Gateway は固定費が発生するため、個人学習環境ではコストが高くなりやすい。

初期段階では以下のいずれかを選択する。

1. 本番相当:
   - ECS Private Subnet
   - NAT Gateway

2. 学習・コスト優先:
   - ネットワークを簡略化
   - 必要な AWS Endpoint を利用
   - または ECS の配置を簡略化

Terraform では後から変更できる構成にする。

---

# 29. Secrets

以下は Git に保存しない。

```text
DATABASE_URL
JWT_SECRET
```

AWS:

```text
Secrets Manager
```

または

```text
SSM Parameter Store
```

から ECS Task に注入する。

---

# 30. Monitoring

CloudWatch Logs を利用する。

```text
ECS
 ↓
CloudWatch Logs
```

最低限確認可能にするもの:

```text
Application Log
Container Start / Stop
Error
HTTP Request Log
```

---

# 31. Terraform

Terraform で管理する。

推奨ディレクトリ:

```text
infra/
├── main.tf
├── variables.tf
├── outputs.tf
├── providers.tf
│
├── modules/
│   ├── network/
│   ├── frontend/
│   ├── ecs/
│   └── database/
│
└── environments/
    └── dev/
```

ただし最初から過剰な Module 分割は行わない。

学習用として可読性を優先する。

---

# 32. Repository Structure

本プロジェクトは pnpm workspace を利用したモノレポ構成とする。

Frontend と Backend は同一リポジトリ内で管理するが、独立したアプリケーションとして扱う。

```text
event-ticket-app/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── api/
│       ├── src/
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       ├── test/
│       ├── Dockerfile
│       └── package.json
│
├── packages/
│   └── ...
│
├── infra/
│   └── terraform/
│
├── docs/
│   └── specification.md
│
├── docker-compose.yml
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── README.md
```

`pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

## Monorepo Policy

- Frontend は `apps/web`
- Backend は `apps/api`
- Infrastructure は `infra/terraform`
- 共有 package は必要になるまで作成しない
- Frontend と Backend のコードを安易に共有しない
- Generic な shared package を先回りして作らない
- API Type の共有が明確に有効になった場合のみ `packages/` を利用する

必要になった場合の例:

```text
packages/
└── api-types/
```

ただし初期実装では `packages/` が空でも問題ない。

## Root Scripts

ルート package.json から主要な処理を実行できるようにする。

例:

```json
{
  "scripts": {
    "dev": "pnpm --parallel --filter ./apps/* dev",
    "dev:web": "pnpm --filter ./apps/web dev",
    "dev:api": "pnpm --filter ./apps/api start:dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test"
  }
}
```

実際の script 名は各 package の構成に合わせて調整する。

---

# 33. Implementation Phases

Codex には一度に全機能を作らせず、以下の順番で実装させることを推奨する。

## Phase 1

```text
NestJS Setup
PostgreSQL
Prisma
Docker Compose
User Model
Event Model
```

## Phase 2

```text
Signup
Login
JWT
Auth Guard
CurrentUser
```

## Phase 3

```text
Event CRUD
Admin Role
Roles Guard
Pagination
Search
```

## Phase 4

```text
Reservation
Ticket
DB Transaction
```

## Phase 5

```text
Concurrency Control
Sold Out Handling
Reservation Cancel
```

## Phase 6

```text
Exception Filter
Logging
Interceptor
Middleware
Swagger
```

## Phase 7

```text
Unit Test
Integration Test
E2E Test
```

## Phase 8

```text
React UI
```

## Phase 9

```text
Terraform
AWS Deployment
```

---

# 34. Definition of Done

以下がすべて動けば一旦完成とする。

- User Signup
- User Login
- JWT Authentication
- Admin Authorization
- Event CRUD
- Event Search
- Pagination
- Event Reservation
- Ticket Issue
- Reservation Transaction
- Concurrent Reservation Protection
- Reservation Cancel
- Swagger
- Common Error Response
- Logging
- Unit Test
- Integration Test
- E2E Test
- React UI
- Docker Compose
- Terraform
- AWS Deployment

---

# 35. Codex Implementation Policy

Codex に実装を依頼する際は以下を守る。

- 仕様を勝手に変更しない
- NestJS の標準的な設計を優先する
- Feature-based directory structure を利用する
- Controller に Business Logic を書かない
- Prisma 操作は Service 層に閉じ込める
- DTO を利用する
- Validation を省略しない
- Transaction が必要な処理は必ず Transaction を利用する
- Password / Secret をログ出力しない
- TypeScript の `any` を原則使用しない
- 過剰な抽象化を避ける
- Repository Pattern は必要になるまで導入しない
- Generic BaseService / BaseRepository は作らない
- 学習目的のため NestJS の標準機能を優先して利用する
- 実装と同時に必要な Test を追加する
- Prisma は開発・本番の両方で Database Client として利用する
- Prisma migration は Git 管理する
- 開発環境では `prisma migrate dev`、本番環境では `prisma migrate deploy` を利用する
- モノレポ構成は `apps/web` と `apps/api` を基本とし、不要な shared package を先に作らない

---

# 36. Future Extensions

学習したい場合に追加する。

```text
Refresh Token
Email Verification
Password Reset
Rate Limit
Redis Cache
SQS
EventBridge
SES
Payment
Seat Reservation
QR Ticket
WebSocket
Audit Log
Soft Delete
Observability
OpenTelemetry
CI/CD
GitHub Actions
```

このアプリを他の Backend Framework 学習に利用する場合も、
Domain Model と API Specification は可能な限り維持する。

これにより、

```text
NestJS
Rails
Laravel
Spring Boot
Go
Rust
```

などの実装を比較しやすくする。
