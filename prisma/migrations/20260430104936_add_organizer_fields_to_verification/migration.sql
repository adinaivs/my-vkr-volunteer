-- AlterTable
ALTER TABLE "email_verification_tokens" ADD COLUMN     "actual_address" TEXT,
ADD COLUMN     "inn" VARCHAR(14),
ADD COLUMN     "legal_address" TEXT,
ADD COLUMN     "okpo" VARCHAR(8),
ADD COLUMN     "organization_name" VARCHAR(255),
ADD COLUMN     "verification_doc_url" TEXT;
