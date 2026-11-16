-- Extension cho tìm kiếm mờ tên bài tập (UC03). Phải có trước index GIN trigram bên dưới.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "UnitPref" AS ENUM ('kg', 'lb');

-- CreateEnum
CREATE TYPE "DumbbellLoad" AS ENUM ('per_dumbbell', 'total');

-- CreateEnum
CREATE TYPE "Mechanic" AS ENUM ('compound', 'isolation');

-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('weight_reps', 'reps', 'duration', 'distance');

-- CreateEnum
CREATE TYPE "ExerciseSource" AS ENUM ('free-exercise-db', 'curated', 'user');

-- CreateEnum
CREATE TYPE "MuscleRole" AS ENUM ('primary', 'secondary');

-- CreateEnum
CREATE TYPE "AliasLang" AS ENUM ('vi', 'en');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "auth_provider" TEXT NOT NULL,
    "auth_subject" TEXT NOT NULL,
    "display_name" TEXT,
    "unit_pref" "UnitPref" NOT NULL DEFAULT 'kg',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    "rpe_enabled" BOOLEAN NOT NULL DEFAULT false,
    "dumbbell_load_default" "DumbbellLoad",
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "muscles" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name_vi" TEXT NOT NULL,
    "muscle_group" TEXT NOT NULL,

    CONSTRAINT "muscles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" UUID NOT NULL,
    "owner_id" UUID,
    "name_en" TEXT NOT NULL,
    "name_vi" TEXT,
    "equipment" TEXT,
    "mechanic" "Mechanic",
    "metric_type" "MetricType" NOT NULL DEFAULT 'weight_reps',
    "source" "ExerciseSource" NOT NULL,
    "source_ref" TEXT,
    "license" TEXT,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_muscles" (
    "exercise_id" UUID NOT NULL,
    "muscle_id" INTEGER NOT NULL,
    "role" "MuscleRole" NOT NULL,

    CONSTRAINT "exercise_muscles_pkey" PRIMARY KEY ("exercise_id","muscle_id")
);

-- CreateTable
CREATE TABLE "exercise_aliases" (
    "id" UUID NOT NULL,
    "exercise_id" UUID NOT NULL,
    "owner_id" UUID,
    "alias" TEXT NOT NULL,
    "alias_normalized" TEXT NOT NULL,
    "lang" "AliasLang" NOT NULL,

    CONSTRAINT "exercise_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_subject_key" ON "users"("auth_subject");

-- CreateIndex
CREATE UNIQUE INDEX "muscles_code_key" ON "muscles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "exercises_source_source_ref_key" ON "exercises"("source", "source_ref");

-- CreateIndex
CREATE INDEX "exercise_aliases_alias_normalized_idx" ON "exercise_aliases" USING GIN ("alias_normalized" gin_trgm_ops);

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_muscles" ADD CONSTRAINT "exercise_muscles_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_muscles" ADD CONSTRAINT "exercise_muscles_muscle_id_fkey" FOREIGN KEY ("muscle_id") REFERENCES "muscles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_aliases" ADD CONSTRAINT "exercise_aliases_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_aliases" ADD CONSTRAINT "exercise_aliases_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
