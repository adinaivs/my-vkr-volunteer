-- AddColumn estimated_hours to tasks
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "estimated_hours" INTEGER NOT NULL DEFAULT 0;

-- AddColumn total_hours_worked to volunteer_profiles
ALTER TABLE "volunteer_profiles" ADD COLUMN IF NOT EXISTS "total_hours_worked" INTEGER NOT NULL DEFAULT 0;
