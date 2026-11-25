-- CreateEnum
CREATE TYPE "SuggestionKind" AS ENUM ('increase', 'celebrate', 'back_off', 'return_from_break', 'deload');

-- CreateEnum
CREATE TYPE "SuggestionStrength" AS ENUM ('soft', 'strong');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('pending', 'accepted', 'dismissed', 'expired');

-- CreateTable
CREATE TABLE "suggestions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "exercise_id" UUID NOT NULL,
    "routine_exercise_id" UUID,
    "session_exercise_id" UUID,
    "based_on_session_exercise_id" UUID,
    "kind" "SuggestionKind" NOT NULL,
    "strength" "SuggestionStrength" NOT NULL,
    "payload" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "SuggestionStatus" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "responded_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "suggestions_user_id_updated_at_idx" ON "suggestions"("user_id", "updated_at");

-- AddForeignKey
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
