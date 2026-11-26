-- CreateTable
CREATE TABLE "user_exercise_settings" (
    "user_id" UUID NOT NULL,
    "exercise_id" UUID NOT NULL,
    "weight_step_kg" DECIMAL NOT NULL,
    "load_input" "LoadInput" NOT NULL,
    "bar_weight_kg" DECIMAL,
    "rest_auto_start" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_exercise_settings_pkey" PRIMARY KEY ("user_id","exercise_id")
);

-- CreateIndex
CREATE INDEX "user_exercise_settings_user_id_updated_at_idx" ON "user_exercise_settings"("user_id", "updated_at");

-- AddForeignKey
ALTER TABLE "user_exercise_settings" ADD CONSTRAINT "user_exercise_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_exercise_settings" ADD CONSTRAINT "user_exercise_settings_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
