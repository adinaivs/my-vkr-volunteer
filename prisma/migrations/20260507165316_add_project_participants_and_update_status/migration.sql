-- Step 1: Add new statuses to ProjectStatus enum
-- Note: Cannot use new enum values in UPDATE statements in same transaction
-- New values: recruiting, upcoming, active, cancelled
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'recruiting' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ProjectStatus')) THEN
        ALTER TYPE "ProjectStatus" ADD VALUE 'recruiting';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'upcoming' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ProjectStatus')) THEN
        ALTER TYPE "ProjectStatus" ADD VALUE 'upcoming';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'active' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ProjectStatus')) THEN
        ALTER TYPE "ProjectStatus" ADD VALUE 'active';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cancelled' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ProjectStatus')) THEN
        ALTER TYPE "ProjectStatus" ADD VALUE 'cancelled';
    END IF;
END $$;

-- Step 2: Create ProjectParticipant table
CREATE TABLE IF NOT EXISTS "project_participants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "volunteer_id" UUID NOT NULL,
    "joined_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "project_participants_pkey" PRIMARY KEY ("id")
);

-- Step 3: Add unique constraint (with check to avoid duplicates)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'project_participants_project_id_volunteer_id_key'
    ) THEN
        CREATE UNIQUE INDEX "project_participants_project_id_volunteer_id_key" 
        ON "project_participants"("project_id", "volunteer_id");
    END IF;
END $$;

-- Step 4: Add foreign keys (with checks)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'project_participants_project_id_fkey'
    ) THEN
        ALTER TABLE "project_participants" ADD CONSTRAINT "project_participants_project_id_fkey" 
        FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'project_participants_volunteer_id_fkey'
    ) THEN
        ALTER TABLE "project_participants" ADD CONSTRAINT "project_participants_volunteer_id_fkey" 
        FOREIGN KEY ("volunteer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Step 5: Add unique constraints to applications and task_assignments
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'applications_project_id_volunteer_id_key'
    ) THEN
        CREATE UNIQUE INDEX "applications_project_id_volunteer_id_key" 
        ON "applications"("project_id", "volunteer_id");
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'task_assignments_task_id_volunteer_id_key'
    ) THEN
        CREATE UNIQUE INDEX "task_assignments_task_id_volunteer_id_key" 
        ON "task_assignments"("task_id", "volunteer_id");
    END IF;
END $$;
