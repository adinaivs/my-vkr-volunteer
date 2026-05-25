-- AlterTable
ALTER TABLE "project_comments" ADD COLUMN     "parent_id" UUID;

-- AddForeignKey
ALTER TABLE "project_comments" ADD CONSTRAINT "project_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "project_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
