-- Add rejection tracking fields to organizer_profiles
ALTER TABLE "organizer_profiles" 
ADD COLUMN "is_rejected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "rejected_at" TIMESTAMP(6),
ADD COLUMN "rejection_reason" TEXT;

-- Add comments
COMMENT ON COLUMN "organizer_profiles"."is_rejected" IS 'Indicates if the organizer has been rejected by admin';
COMMENT ON COLUMN "organizer_profiles"."rejected_at" IS 'Timestamp when the organizer was rejected';
COMMENT ON COLUMN "organizer_profiles"."rejection_reason" IS 'Reason for rejection provided by admin';
