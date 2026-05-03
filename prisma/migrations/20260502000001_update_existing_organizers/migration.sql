-- Update existing organizer profiles to have isApprovedByAdmin = false if NULL
UPDATE "organizer_profiles" 
SET "is_approved_by_admin" = false 
WHERE "is_approved_by_admin" IS NULL;
