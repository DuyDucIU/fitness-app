-- Khoá ngoại session_exercises → exercises kiểm lúc commit. Xoá user thì bài tuỳ chỉnh của
-- user (users → exercises) và buổi tập dùng bài đó (users → workout_sessions →
-- session_exercises) cùng bị xoá theo cascade; kiểm ngay thì bài bị xoá trước và lỗi.
-- Prisma không khai báo được DEFERRABLE nên viết tay.
ALTER TABLE "session_exercises"
  ALTER CONSTRAINT "session_exercises_exercise_id_fkey" DEFERRABLE INITIALLY DEFERRED;
