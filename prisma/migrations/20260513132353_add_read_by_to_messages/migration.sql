-- AlterTable
ALTER TABLE "direct_messages" ADD COLUMN     "read_by" UUID[] DEFAULT ARRAY[]::UUID[];

-- AlterTable
ALTER TABLE "project_chat_messages" ADD COLUMN     "read_by" UUID[] DEFAULT ARRAY[]::UUID[];
