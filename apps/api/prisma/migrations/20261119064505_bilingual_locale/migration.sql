-- Song ngữ (D27, SDD 3.5): ngôn ngữ giao diện của user và tên tiếng Anh của nhóm cơ.

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('en', 'vi');

-- AlterTable: thêm cột cho phép null, điền tạm từ `code` cho các dòng đã seed,
-- rồi mới đặt NOT NULL. Chạy lại seed để có tên tiếng Anh chuẩn (prisma/seed/muscles.ts).
ALTER TABLE "muscles" ADD COLUMN "name_en" TEXT;
UPDATE "muscles" SET "name_en" = initcap("code") WHERE "name_en" IS NULL;
ALTER TABLE "muscles" ALTER COLUMN "name_en" SET NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "locale" "Locale" NOT NULL DEFAULT 'en';
