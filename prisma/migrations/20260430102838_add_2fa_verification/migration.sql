/*
  Warnings:

  - The primary key for the `email_verification_tokens` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `token` on the `email_verification_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `email_verification_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `token` on the `password_reset_tokens` table. All the data in the column will be lost.
  - Added the required column `city` to the `email_verification_tokens` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `email_verification_tokens` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `email_verification_tokens` table without a default value. This is not possible if the table is not empty.
  - Added the required column `first_name` to the `email_verification_tokens` table without a default value. This is not possible if the table is not empty.
  - Added the required column `last_name` to the `email_verification_tokens` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password_hash` to the `email_verification_tokens` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `email_verification_tokens` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role` to the `email_verification_tokens` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `password_reset_tokens` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "email_verification_tokens" DROP CONSTRAINT "email_verification_tokens_user_id_fkey";

-- AlterTable
ALTER TABLE "email_verification_tokens" DROP CONSTRAINT "email_verification_tokens_pkey",
DROP COLUMN "token",
DROP COLUMN "user_id",
ADD COLUMN     "city" VARCHAR(100) NOT NULL,
ADD COLUMN     "code" VARCHAR(6) NOT NULL,
ADD COLUMN     "email" VARCHAR(255) NOT NULL,
ADD COLUMN     "first_name" VARCHAR(100) NOT NULL,
ADD COLUMN     "last_name" VARCHAR(100) NOT NULL,
ADD COLUMN     "password_hash" VARCHAR(255) NOT NULL,
ADD COLUMN     "phone" VARCHAR(20) NOT NULL,
ADD COLUMN     "role" "UserRole" NOT NULL,
ADD CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("email");

-- AlterTable
ALTER TABLE "password_reset_tokens" DROP COLUMN "token",
ADD COLUMN     "code" VARCHAR(6) NOT NULL;
