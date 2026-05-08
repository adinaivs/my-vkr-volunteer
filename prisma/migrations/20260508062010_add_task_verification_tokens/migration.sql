-- CreateTable
CREATE TABLE "task_verification_tokens" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "created_by" UUID NOT NULL,
    "used_by" UUID,
    "used_at" TIMESTAMP(6),
    "expires_at" TIMESTAMP(6) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "task_verification_tokens_token_key" ON "task_verification_tokens"("token");

-- AddForeignKey
ALTER TABLE "task_verification_tokens" ADD CONSTRAINT "task_verification_tokens_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_verification_tokens" ADD CONSTRAINT "task_verification_tokens_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_verification_tokens" ADD CONSTRAINT "task_verification_tokens_used_by_fkey" FOREIGN KEY ("used_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
