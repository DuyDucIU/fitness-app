-- CreateEnum
CREATE TYPE "BodyMetricKind" AS ENUM ('weight', 'waist', 'body_fat');

-- CreateEnum
CREATE TYPE "BodyMetricSource" AS ENUM ('manual', 'health_connect');

-- CreateTable
CREATE TABLE "body_metrics" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "metric" "BodyMetricKind" NOT NULL,
    "value" DECIMAL NOT NULL,
    "measured_at" TIMESTAMPTZ(6) NOT NULL,
    "source" "BodyMetricSource" NOT NULL,
    "external_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "edited_at" TIMESTAMPTZ(6),

    CONSTRAINT "body_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "body_metrics_user_id_measured_at_idx" ON "body_metrics"("user_id", "measured_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "body_metrics_user_id_source_external_id_key" ON "body_metrics"("user_id", "source", "external_id");

-- AddForeignKey
ALTER TABLE "body_metrics" ADD CONSTRAINT "body_metrics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
