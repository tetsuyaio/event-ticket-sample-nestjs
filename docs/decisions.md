# 実装上の決定事項

## 2026-08-14 初期実装

- `POST /auth/signup` では `USER` のみ作成し、`ADMIN` は Prisma seed で用意する。
- Event の公開・終了・キャンセルは `PATCH /events/:id` の `status` 更新で行う。
- 公開 API のイベント一覧・詳細は `PUBLISHED` のみ返し、ADMIN の認証時は全 status を参照できる。
- 予約のある Event は整合性と履歴保護のため物理削除を拒否する。
- `(userId, eventId)` の一意制約を維持し、キャンセル後の再予約は初期実装では許可しない。
- 予約は PostgreSQL の条件付き `UPDATE` をトランザクション内で実行し、残席確認と加算を原子的に行う。
- キャンセルは status の条件付き更新を起点にし、同時キャンセルでも `reservedCount` が二重減算されないようにする。
- JWT 有効期限の既定値は 1 時間。日時は ISO 8601/UTC で API に入出力する。
- ユーザー指示により Terraform と AWS Deployment は今回の実装対象外とする。
