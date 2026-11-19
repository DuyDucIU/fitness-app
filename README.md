# Fitness Tracking and Training System

Monorepo (npm workspaces) cho ứng dụng theo dõi tập luyện. Thiết kế nằm trong [docs/](docs/) (SRS, SDD). Phạm vi hiện tại: **MVP** — web app di động (PWA) cho Safari iOS và Chrome Android, backend chạy localhost (SDD D26). Các phần post-MVP (import LLM, Health Connect qua bản bọc Capacitor, video, beta công khai) chưa dựng.

Thành viên mới: đọc [docs/ONBOARDING.md](docs/ONBOARDING.md) trước.

| Thư mục              | Nội dung                                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------- |
| `apps/web`           | PWA: Vite + React + `vite-plugin-pwa`, Dexie (IndexedDB), React Router, TanStack Query, shadcn/ui, Supabase |
| `apps/api`           | NestJS 11 + Prisma 7 + PostgreSQL; có `main.ts` (API) và `worker.ts` (cron)                                 |
| `packages/contract`  | Schema Zod dùng chung (nguồn sự thật của API contract)                                                      |
| `packages/engine`    | Progression engine (hàm thuần, Vitest)                                                                      |
| `packages/templates` | Chương trình mẫu YAML + schema kiểm tra                                                                     |

## Yêu cầu

- Node 24 (`.nvmrc`), npm 11, Docker Desktop.
- Để thử app trên điện thoại: xem mục "Thử PWA" bên dưới.

## Chạy lần đầu

```bash
npm install
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

docker compose up -d                       # chỉ bật PostgreSQL
npm run db:generate -w @fitness/api        # sinh Prisma client (không commit)
npm run db:deploy -w @fitness/api          # áp migration
npm run db:seed -w @fitness/api            # nạp catalog bài tập (42 bài, tên Việt là bản nháp)
npm run build                              # build contract/engine/templates/api/web (theo thứ tự)
```

Sau đó điền thông tin Supabase vào các file `.env` (xem mục "Supabase Auth"). Chưa điền thì app vẫn chạy, nhưng mọi thao tác cần đăng nhập sẽ báo lỗi "Chưa cấu hình Supabase".

## Lệnh hay dùng

| Lệnh                                       | Việc                                                  |
| ------------------------------------------ | ----------------------------------------------------- |
| `npm run dev:api`                          | API chạy watch tại http://localhost:3000/v1           |
| `npm run dev:web`                          | Web app (Vite) tại http://localhost:5173              |
| `npm run verify`                           | build + typecheck + lint + test toàn repo             |
| `npm run test:e2e -w @fitness/api`         | Test tích hợp API (cần Postgres đang chạy và migrate) |
| `docker compose --profile full up --build` | Chạy cả postgres + migrate + api + worker (demo)      |

- Swagger UI (chỉ ngoài production): http://localhost:3000/api — sinh từ schema Zod.
- `docker compose` mặc định chỉ chạy `postgres`; `migrate`, `api`, `worker` thuộc profile `full`.
- Nếu `docker compose --profile full up --build` báo _"additional privileges requested"_ (buildx bake trên Windows), chạy kèm `BUILDX_BAKE_ENTITLEMENTS_FS=0`.

## Supabase Auth (cloud)

1. Tạo project Supabase (miễn phí). Chỉ dùng **Auth**, không dùng database của Supabase.
2. Bật Email provider (tạm tắt "Confirm email" khi dev nếu muốn thử nhanh).
3. Điền `SUPABASE_URL` vào `apps/api/.env`; điền `VITE_SUPABASE_URL` và `VITE_SUPABASE_PUBLISHABLE_KEY` vào `apps/web/.env`.
4. Đăng nhập Google (redirect OAuth): bật Google provider và thêm URL của web app (vd `http://localhost:5173`, URL host demo) vào **Authentication > URL Configuration > Redirect URLs**.
5. Nếu project dùng JWT secret chung (HS256) thì điền thêm `SUPABASE_JWT_SECRET`; để trống thì API verify bằng JWKS.
6. Không dùng/không commit `service_role` key.

## Dev hằng ngày

```bash
docker compose up -d    # chỉ bật PostgreSQL
npm run dev:api         # API: http://localhost:3000/v1 (tự restart khi sửa code)
npm run dev:web         # Web: http://localhost:5173 (tự reload khi sửa code)
```

- Mở http://localhost:5173, bật chế độ thiết bị di động trong DevTools để xem giao diện mobile.
- Ở chế độ dev **không có service worker**: app không chạy offline, không cài được, không có thông báo cập nhật. Muốn thử các phần đó, xem mục "Thử PWA" bên dưới.
- Sau khi `git pull`:
  - có migration mới (thư mục `apps/api/prisma/migrations`) → `npm run db:deploy -w @fitness/api` rồi `npm run db:generate -w @fitness/api`;
  - có thay đổi ở `packages/contract` hoặc `packages/engine` → `npm run build` (API đọc bản build trong `dist`; web đọc thẳng mã nguồn nên không cần).

**Sửa schema database (Prisma):**

```bash
# 1. Sửa apps/api/prisma/schema.prisma
npm run db:migrate -w @fitness/api -- --name them_bang_plans   # 2. tạo file migration mới + áp vào DB của bạn
npm run db:generate -w @fitness/api                            # 3. sinh lại Prisma client (Prisma 7 không tự chạy)
# 4. Commit cả schema.prisma lẫn thư mục migration mới sinh ra
```

| Lệnh          | Dùng khi                                                                                           |
| ------------- | -------------------------------------------------------------------------------------------------- |
| `db:migrate`  | **Bạn** sửa schema: tạo migration mới từ thay đổi và áp vào DB local (`prisma migrate dev`)        |
| `db:deploy`   | **Người khác** đã tạo migration (pull về), hoặc khi deploy: chỉ áp migration có sẵn, không tạo mới |
| `db:generate` | Sau mỗi lần schema đổi (do mình hay do pull) — cập nhật type/client trong `src/generated`          |
| `db:seed`     | Nạp lại catalog bài tập (Prisma 7 không tự seed sau migrate)                                       |
| `db:studio`   | Xem/sửa dữ liệu trong DB bằng giao diện web                                                        |

- Không sửa tay file migration đã commit; cần đổi thì tạo migration mới.
- Nếu `db:migrate` báo DB lệch (drift) và đề nghị reset: đồng ý chỉ khi chấp nhận mất dữ liệu local, sau đó chạy lại `db:seed`.

**Web ↔ API:** web gọi API theo `VITE_API_URL` (`apps/web/.env`); API chỉ nhận request từ các origin trong `CORS_ORIGINS` (`apps/api/.env`, mặc định `http://localhost:5173,http://localhost:4173`). Port của Vite cố định (`strictPort`): nếu 5173 hoặc 4173 bị chiếm, Vite báo lỗi thay vì tự đổi port. Đổi port/URL của web thì phải sửa cả hai biến.

## Thử PWA (offline, cài app, cập nhật)

Chỉ cần khi muốn kiểm tra hành vi PWA — vd trước khi demo. Service worker chỉ có ở bản build:

```bash
npm run build -w @fitness/web
npm run preview -w @fitness/web   # http://localhost:4173 (đã có sẵn trong CORS_ORIGINS)
```

- **Offline:** mở trang một lần, rồi tắt mạng (DevTools → Network → Offline) và tải lại — app vẫn mở.
- **Cập nhật:** sửa code, build lại, tải lại trang đang mở → hiện thông báo "Có bản cập nhật mới".
- **Cài lên điện thoại thật** cần **HTTPS** (trừ `localhost`): deploy bản build lên host tĩnh HTTPS hoặc mở qua tunnel, rồi thêm origin đó vào `CORS_ORIGINS` (xem SDD 4.4). iPhone: Safari → Chia sẻ → Thêm vào MH chính; Android: Chrome → Cài đặt ứng dụng.
- Test thật trên Safari/iPhone — Chrome DevTools không giả lập được WebKit.

## Ghi chú kỹ thuật

- PostgreSQL của Docker mở ở **`127.0.0.1:5433`** (không phải 5432) để không đụng PostgreSQL cài sẵn trên máy (vd service `postgresql-x64-18` trên Windows). Đổi cổng bằng `POSTGRES_PORT` (`.env` gốc) và nhớ sửa `DATABASE_URL` trong `apps/api/.env` cho khớp.
- Windows App Control trên máy dev có thể chặn binary native không ký (vd `turbo.exe`), nên repo **không dùng Turborepo**; thứ tự build theo thứ tự khai báo `workspaces` trong `package.json`.
- Prisma dùng bản 7.x (tag `latest` trên npm hiện là 8 rc). NestJS dùng bản 11 vì `nestjs-zod` chưa hỗ trợ NestJS 12.
- TypeScript ghim `~6.0.3` (TS 7 chưa tương thích với `@nestjs/swagger` và `typescript-eslint`). TS 6 không tự nạp `@types/*`, nên `tsconfig` khai báo `types` tường minh.
- `apps/web` đọc thẳng mã nguồn TS của `@fitness/contract` và `@fitness/engine` (alias trong `vite.config.ts`) vì hai package build ra CommonJS cho NestJS — nhờ vậy Vite tree-shake được zod.
- Component trong `apps/web/src/components/ui` do shadcn CLI sinh (`npx shadcn@latest add <tên>` trong `apps/web`), theme lấy từ token trong `DESIGN.md` (xem `src/index.css`).
- Design system: token nằm ở `apps/web/src/index.css` (`@theme`, lấy từ `DESIGN.md`); primitive ở `src/components` (khung màn hình, hàng, chip, trường nhập, sheet, toast, chip đồng bộ…). Xem tất cả ở **`/dev/kit`** khi chạy `npm run dev:web` (route chỉ có ở dev, có nút chuyển EN/VI). Import `cn` từ `@/lib/utils` (đã khai báo token riêng); component mới do shadcn CLI sinh import thẳng từ `cn`, ESLint sẽ báo để đổi lại.
- Vite resolve alias bằng đường dẫn thật (`realpathSync.native`) vì trên Windows chữ ổ đĩa lệch hoa/thường (`d:` / `D:`) làm một package bị nạp hai bản (lỗi hook `null`, context router `null`).
- Song ngữ (SDD 3.5): message ở `apps/web/messages/{en,vi}.json` (tiếng Anh là gốc), gọi qua `m.<key>()` từ `@/paraglide/messages.js`. Thư mục `src/paraglide` do Paraglide sinh, không sửa tay. Thêm key thì thêm vào **cả hai** file; `npm run lint -w @fitness/web` chạy `inlang check` và báo lỗi nếu thiếu bản dịch. Số và ngày hiển thị đi qua `src/lib/format.ts`.
- Catalog bài tập nạp từ [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense), ghim commit trong `apps/api/prisma/seed/data/SOURCE_COMMIT.txt`; thêm bài bằng cách thêm dòng vào `apps/api/prisma/seed/catalog.yaml`.
