-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "moderated_at" TIMESTAMP(6),
ADD COLUMN     "moderated_by" UUID;
