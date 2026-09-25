-- AlterTable
ALTER TABLE "pages" ADD COLUMN     "menu_heading" VARCHAR(60),
ADD COLUMN     "menu_label" VARCHAR(60),
ADD COLUMN     "menu_order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "parent_id" TEXT;

-- CreateIndex
CREATE INDEX "pages_parent_id_idx" ON "pages"("parent_id");

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: the website menu used to be hard-coded as "About" with About Us,
-- Our History and Board of Governance in its dropdown. Describe exactly that
-- with the new columns, so the menu looks the same once it is read from here.
UPDATE "pages"
SET "menu_label" = 'About Us', "menu_heading" = 'About', "menu_order" = 0
WHERE "slug" = 'about-us';

UPDATE "pages"
SET "parent_id" = (SELECT "id" FROM "pages" WHERE "slug" = 'about-us'),
    "menu_label" = 'Our History',
    "menu_order" = 1
WHERE "slug" = 'history';

UPDATE "pages"
SET "parent_id" = (SELECT "id" FROM "pages" WHERE "slug" = 'about-us'),
    "menu_label" = 'Board of Governance',
    "menu_order" = 2
WHERE "slug" = 'board-of-governance';

-- Pages named "about-<x>" are published at /about/<x>, so they belong in the
-- About dropdown too; list them after the three above.
UPDATE "pages"
SET "parent_id" = (SELECT "id" FROM "pages" WHERE "slug" = 'about-us'),
    "menu_order" = 10
WHERE "slug" LIKE 'about-%' AND "slug" <> 'about-us' AND "parent_id" IS NULL;
