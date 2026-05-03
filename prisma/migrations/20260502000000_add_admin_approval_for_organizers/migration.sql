-- Add admin approval fields to organizer_profiles
ALTER TABLE "organizer_profiles" 
ADD COLUMN "is_approved_by_admin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "approved_at" TIMESTAMP(6);

-- Add comment
COMMENT ON COLUMN "organizer_profiles"."is_approved_by_admin" IS 'Indicates if the organizer has been approved by an admin';
COMMENT ON COLUMN "organizer_profiles"."approved_at" IS 'Timestamp when the organizer was approved by admin';
