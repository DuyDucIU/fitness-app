# @fitness/api

Backend NestJS 11 + Prisma 7 + PostgreSQL của Fitness Tracking. Hai tiến trình dùng chung code:

- `src/main.ts` — REST API (prefix `/v1`, verify JWT Supabase, CORS theo `CORS_ORIGINS`, Swagger ở `/api` ngoài production).
- `src/worker.ts` — cron (đánh giá streak tuần).

Cài đặt, biến môi trường và lệnh chạy: xem [README ở thư mục gốc](../../README.md). Thiết kế: [docs/](../../docs/).

| Lệnh (chạy từ thư mục gốc)            | Việc                                        |
| ------------------------------------- | ------------------------------------------- |
| `npm run dev:api`                     | API chạy watch tại http://localhost:3000/v1 |
| `npm run db:generate -w @fitness/api` | Sinh Prisma client (`src/generated`)        |
| `npm run db:deploy -w @fitness/api`   | Áp migration                                |
| `npm run db:seed -w @fitness/api`     | Nạp catalog bài tập                         |
| `npm run test -w @fitness/api`        | Unit test (Jest)                            |
| `npm run test:e2e -w @fitness/api`    | Test tích hợp (cần Postgres đang chạy)      |
