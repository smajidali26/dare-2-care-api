-- CreateEnum
CREATE TYPE "SubscriberType" AS ENUM ('PERMANENT', 'GENERAL', 'SUPPORTER');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('DONATION', 'ZAKAT', 'MEMBER_FEE', 'CHARITY');

-- AlterTable
ALTER TABLE "subscribers" ADD COLUMN     "payment_type" "PaymentType" NOT NULL DEFAULT 'DONATION',
ADD COLUMN     "profile_image_url" TEXT,
ADD COLUMN     "subscriber_type" "SubscriberType" NOT NULL DEFAULT 'GENERAL';

-- CreateTable
CREATE TABLE "pages" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "meta_description" VARCHAR(160),
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pages_slug_key" ON "pages"("slug");
