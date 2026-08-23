# Event Ticket Reservation App

NestJS・Prisma・PostgreSQL と React で実装した、イベントチケット予約のリファレンスアプリです。

## ローカル起動

```bash
cp .env.example .env
pnpm install
docker compose up -d postgres
pnpm prisma:generate
pnpm prisma:migrate
pnpm --filter ./apps/api prisma:seed
pnpm dev
```

- Web: http://localhost:5173
- API: http://localhost:3000
- Swagger: http://localhost:3000/docs

全サービスをコンテナで起動する場合は `docker compose up --build` を使用し、Web を http://localhost:8080 で開きます。初期 ADMIN は `.env` の `ADMIN_EMAIL` / `ADMIN_PASSWORD` で seed します。

## テストと品質確認

```bash
pnpm build
pnpm lint
pnpm test
pnpm --filter ./apps/api test:e2e
```

E2E は `DATABASE_URL` が指す専用 PostgreSQL に migration を適用してから実行してください。

## 同時予約の設計

残席確認と `reservedCount` 加算を別々に実行すると、複数リクエストが同じ残席を読み取る Race Condition / Lost Update が起きます。本実装ではトランザクション内で次の条件付き更新を実行します。

```sql
UPDATE "Event"
SET "reservedCount" = "reservedCount" + 1
WHERE "id" = $1
  AND "reservedCount" < "capacity"
  AND "status" = 'PUBLISHED';
```

更新件数が 0 なら満席として扱います。この Atomic Update は、アプリ側の Optimistic Lock 用 version 列や、行を明示ロックする Pessimistic Lock を追加せずに不変条件を守れます。処理全体は PostgreSQL の `READ COMMITTED` トランザクションで Reservation/Ticket 作成と一体化し、途中の unique constraint 違反などでは加算もロールバックされます。より複雑な在庫計算では `SERIALIZABLE` とリトライ、または行ロックも選択肢です。

キャンセル側も Reservation の status を条件付き更新し、その更新に成功したトランザクションだけが Ticket の無効化とカウント減算を行います。

## セキュリティ

- パスワードは bcrypt（cost 12）でハッシュ化し、API レスポンスやログへ含めません。
- JWT secret と DB 接続情報は環境変数で注入します。
- DTO の許可外フィールドを拒否し、JWT Guard・Role Guard・所有者条件を適用します。
- HTTP ヘッダーは Helmet、API にはレート制限を適用します。

仕様上の未指定事項に対する判断は [docs/decisions.md](docs/decisions.md) に記録しています。
