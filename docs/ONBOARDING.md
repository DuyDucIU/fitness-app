# Onboarding teammate

Mục tiêu: clone repo về và chạy được web + API trên máy trong khoảng 30 phút. Chi tiết hơn ở [README](../README.md); thiết kế ở [SRS/SDD](./).

## 1. Chuẩn bị

- **Quyền truy cập:** nhận lời mời vào GitHub repo. Không cần tài khoản Supabase.
- **Thông tin Supabase:** xin trong nhóm chat 2 giá trị **Project URL** và **publishable key** (không phải secret; tuyệt đối không dùng `service_role` key).
- **Cài đặt:** Node 24 (xem `.nvmrc`), npm 11, Docker Desktop, Git.

## 2. Cài lần đầu

```bash
git clone <url-repo> fitness-app && cd fitness-app
npm install

cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Điền Supabase vào 2 file (các biến khác giữ mặc định):

| File            | Biến                                                                     |
| --------------- | ------------------------------------------------------------------------ |
| `apps/api/.env` | `SUPABASE_URL` = Project URL                                             |
| `apps/web/.env` | `VITE_SUPABASE_URL` = Project URL, `VITE_SUPABASE_PUBLISHABLE_KEY` = key |

Mở Docker Desktop (đợi "Engine running"), rồi:

```bash
docker compose up -d                  # PostgreSQL ở 127.0.0.1:5433
npm run db:generate -w @fitness/api
npm run db:deploy -w @fitness/api
npm run db:seed -w @fitness/api
npm run build
npm run verify                        # phải pass hết
```

## 3. Chạy hằng ngày

```bash
docker compose up -d
npm run dev:api     # http://localhost:3000/v1  (Swagger: http://localhost:3000/api)
npm run dev:web     # http://localhost:5173
```

Mở http://localhost:5173 → thấy "API: OK" là xong.

## 4. Quy ước khi code

- Database là **riêng từng máy**; tài khoản đăng nhập thì **dùng chung** (Supabase cloud).
- Thêm/đổi API: viết schema Zod trong `packages/contract` trước, rồi API và web cùng dùng.
- Sửa schema DB: `npm run db:migrate -w @fitness/api -- --name <ten>` → `npm run db:generate -w @fitness/api` → commit cả `schema.prisma` lẫn thư mục migration mới.
- Sau khi `git pull`: có migration mới → `db:deploy` rồi `db:generate`; có đổi `packages/contract`/`engine` → `npm run build`.
- Thêm component UI: `npx shadcn@latest add <tên>` trong `apps/web` (không tự viết lại component có sẵn).
- Chạy `npm run verify` trước khi push. Không commit file `.env`.

## 5. Lỗi hay gặp

| Triệu chứng                                    | Cách xử lý                                                                                               |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `docker compose up` báo port không dùng được   | Có PostgreSQL khác đang chiếm cổng. Đổi `POSTGRES_PORT` trong `.env` gốc và cổng trong `DATABASE_URL` của `apps/api/.env` cho khớp |
| `failed to connect to the docker API`          | Docker Desktop chưa mở                                                                                   |
| `dev:api`/`dev:web` báo port đang bị dùng      | Một bản API/Vite khác còn chạy (cổng 3000/5173 cố định). Tắt nó rồi chạy lại                             |
| Web hiện "API: Lỗi"                            | API chưa chạy, hoặc origin của web không nằm trong `CORS_ORIGINS` (`apps/api/.env`)                      |
| Đăng nhập báo "Chưa cấu hình Supabase"         | Chưa điền `VITE_SUPABASE_*` trong `apps/web/.env` (sửa xong phải chạy lại `dev:web`)                     |
| Code không thấy bảng/field mới sau khi đổi schema | Quên `npm run db:generate -w @fitness/api`                                                            |
