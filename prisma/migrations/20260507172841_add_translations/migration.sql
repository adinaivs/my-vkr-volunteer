/*
  Warnings:

  - The values [published] on the enum `ProjectStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "Language" AS ENUM ('ru', 'kg');

-- AlterEnum
BEGIN;
CREATE TYPE "ProjectStatus_new" AS ENUM ('draft', 'moderation', 'rejected', 'recruiting', 'upcoming', 'active', 'completed', 'cancelled', 'blocked');
ALTER TABLE "projects" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "projects" ALTER COLUMN "status" TYPE "ProjectStatus_new" USING ("status"::text::"ProjectStatus_new");
ALTER TYPE "ProjectStatus" RENAME TO "ProjectStatus_old";
ALTER TYPE "ProjectStatus_new" RENAME TO "ProjectStatus";
DROP TYPE "ProjectStatus_old";
ALTER TABLE "projects" ALTER COLUMN "status" SET DEFAULT 'draft';
COMMIT;

-- AlterTable
ALTER TABLE "project_participants" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "skill_translations" (
    "id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "locale" "Language" NOT NULL,
    "name" VARCHAR(255) NOT NULL,

    CONSTRAINT "skill_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_translations" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "locale" "Language" NOT NULL,
    "name" VARCHAR(255) NOT NULL,

    CONSTRAINT "category_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievement_translations" (
    "id" UUID NOT NULL,
    "achievement_id" UUID NOT NULL,
    "locale" "Language" NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "achievement_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "skill_translations_skill_id_locale_key" ON "skill_translations"("skill_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "category_translations_category_id_locale_key" ON "category_translations"("category_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "achievement_translations_achievement_id_locale_key" ON "achievement_translations"("achievement_id", "locale");

-- AddForeignKey
ALTER TABLE "skill_translations" ADD CONSTRAINT "skill_translations_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_translations" ADD CONSTRAINT "category_translations_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievement_translations" ADD CONSTRAINT "achievement_translations_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing data: create Russian translations from existing names
-- Skills
INSERT INTO "skill_translations" ("id", "skill_id", "locale", "name")
SELECT gen_random_uuid(), "id", 'ru', "name"
FROM "skills"
WHERE EXISTS (SELECT 1 FROM "skills");

-- Categories  
INSERT INTO "category_translations" ("id", "category_id", "locale", "name")
SELECT gen_random_uuid(), "id", 'ru', "slug"
FROM "categories"
WHERE EXISTS (SELECT 1 FROM "categories");

-- Achievements
INSERT INTO "achievement_translations" ("id", "achievement_id", "locale", "name", "description")
SELECT gen_random_uuid(), "id", 'ru', "name", "description"
FROM "achievements"
WHERE EXISTS (SELECT 1 FROM "achievements");
