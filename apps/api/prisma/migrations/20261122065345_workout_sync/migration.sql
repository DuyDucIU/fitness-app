-- CreateEnum
CREATE TYPE "LoadInput" AS ENUM ('total', 'per_side', 'per_dumbbell', 'stack', 'added_weight');

-- CreateEnum
CREATE TYPE "SetType" AS ENUM ('warmup', 'working', 'drop', 'failure');

-- CreateTable
CREATE TABLE "workout_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "routine_day_id" UUID,
    "started_at" TIMESTAMPTZ(6) NOT NULL,
    "ended_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "health_external_id" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "workout_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_exercises" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "exercise_id" UUID NOT NULL,
    "routine_exercise_id" UUID,
    "load_input" "LoadInput" NOT NULL,
    "position" INTEGER NOT NULL,
    "superset_group" INTEGER,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "session_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "set_logs" (
    "id" UUID NOT NULL,
    "session_exercise_id" UUID NOT NULL,
    "set_index" INTEGER NOT NULL,
    "set_type" "SetType" NOT NULL,
    "weight_value" DECIMAL,
    "input_unit" "UnitPref",
    "reps" INTEGER,
    "duration_s" INTEGER,
    "distance_m" DECIMAL,
    "rpe" DECIMAL,
    "completed_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "set_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workout_sessions_user_id_updated_at_idx" ON "workout_sessions"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "session_exercises_session_id_idx" ON "session_exercises"("session_id");

-- CreateIndex
CREATE INDEX "set_logs_session_exercise_id_idx" ON "set_logs"("session_exercise_id");

-- AddForeignKey
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_exercises" ADD CONSTRAINT "session_exercises_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "workout_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_exercises" ADD CONSTRAINT "session_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "set_logs" ADD CONSTRAINT "set_logs_session_exercise_id_fkey" FOREIGN KEY ("session_exercise_id") REFERENCES "session_exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
