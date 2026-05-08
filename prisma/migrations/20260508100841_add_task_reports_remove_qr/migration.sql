/*
  Warnings:

  - You are about to drop the `task_verification_tokens` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "task_verification_tokens" DROP CONSTRAINT "task_verification_tokens_created_by_fkey";

-- DropForeignKey
ALTER TABLE "task_verification_tokens" DROP CONSTRAINT "task_verification_tokens_task_id_fkey";

-- DropForeignKey
ALTER TABLE "task_verification_tokens" DROP CONSTRAINT "task_verification_tokens_used_by_fkey";

-- DropTable
DROP TABLE "task_verification_tokens";

-- CreateTable
CREATE TABLE "task_reports" (
    "id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "photos" TEXT[],
    "submitted_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "task_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "task_reports_assignment_id_key" ON "task_reports"("assignment_id");

-- AddForeignKey
ALTER TABLE "task_reports" ADD CONSTRAINT "task_reports_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "task_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
