-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "applied_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "task_id" UUID;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
