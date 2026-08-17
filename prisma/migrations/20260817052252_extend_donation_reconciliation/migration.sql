-- DARE2CARE-8 (ADR-0005): extend the existing "donations" ledger additively with the
-- pledge-reconciliation spine. Every new column is nullable, so this migration is safe
-- against the live table and does not touch any existing row's amount/status/receivedAt.

-- AlterTable
ALTER TABLE "donations" ADD COLUMN     "period_month" VARCHAR(7),
ADD COLUMN     "reference" TEXT,
ADD COLUMN     "voided_at" TIMESTAMP(3),
ADD COLUMN     "voided_by_user_id" TEXT,
ADD COLUMN     "void_reason" TEXT;

-- Safety guard for the new recorded_by_user_id -> users FK below: null out any
-- recorded_by_user_id value that does not match an existing users.id before the
-- constraint is added, so the migration cannot fail on live data. Verified by a
-- read-only pre-check on 2026-08-17 against this database: 0 orphaned rows found
-- (1 donation row total, recorded_by_user_id populated and valid). This UPDATE is
-- therefore expected to affect 0 rows here; it is kept as a guard so the migration
-- remains safe to run unattended in any other environment.
UPDATE "donations"
SET "recorded_by_user_id" = NULL
WHERE "recorded_by_user_id" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "users" WHERE "users"."id" = "donations"."recorded_by_user_id");

-- CreateIndex
CREATE INDEX "donations_donor_id_period_month_idx" ON "donations"("donor_id", "period_month");

-- CreateIndex
CREATE INDEX "donations_period_month_idx" ON "donations"("period_month");

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_voided_by_user_id_fkey" FOREIGN KEY ("voided_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
