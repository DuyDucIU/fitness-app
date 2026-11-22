-- CreateEnum
CREATE TYPE "RoutineSource" AS ENUM ('manual', 'program', 'import_text', 'import_image', 'import_video');

-- CreateTable
CREATE TABLE "routines" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "program_id" TEXT,
    "name" TEXT NOT NULL,
    "source" "RoutineSource" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "routines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routine_days" (
    "id" UUID NOT NULL,
    "routine_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "routine_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routine_exercises" (
    "id" UUID NOT NULL,
    "routine_day_id" UUID NOT NULL,
    "exercise_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "superset_group" INTEGER,
    "target_sets" INTEGER NOT NULL,
    "initial_weight_kg" DECIMAL,
    "warmup_enabled" BOOLEAN,
    "rep_min" INTEGER,
    "rep_max" INTEGER,
    "target_duration_min_s" INTEGER,
    "target_duration_max_s" INTEGER,
    "target_rpe" DECIMAL,
    "rest_seconds" INTEGER NOT NULL,
    "progression_scheme" TEXT,
    "progression_params" JSONB,
    "notes" TEXT,

    CONSTRAINT "routine_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "routines_user_id_idx" ON "routines"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "routines_one_active_per_user" ON "routines"("user_id") WHERE (is_active);

-- CreateIndex
CREATE INDEX "routine_days_routine_id_idx" ON "routine_days"("routine_id");

-- CreateIndex
CREATE INDEX "routine_exercises_routine_day_id_idx" ON "routine_exercises"("routine_day_id");

-- AddForeignKey
ALTER TABLE "routines" ADD CONSTRAINT "routines_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_days" ADD CONSTRAINT "routine_days_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "routines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_exercises" ADD CONSTRAINT "routine_exercises_routine_day_id_fkey" FOREIGN KEY ("routine_day_id") REFERENCES "routine_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_exercises" ADD CONSTRAINT "routine_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
