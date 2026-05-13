-- AlterTable
ALTER TABLE "direct_messages" ADD COLUMN     "delivered_to" UUID[] DEFAULT ARRAY[]::UUID[];

-- AlterTable
ALTER TABLE "project_chat_messages" ADD COLUMN     "delivered_to" UUID[] DEFAULT ARRAY[]::UUID[];
