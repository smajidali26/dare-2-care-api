-- AlterTable
ALTER TABLE "subscribers" ADD COLUMN     "display_order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "is_management" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "management_bio" TEXT,
ADD COLUMN     "management_role" TEXT;
