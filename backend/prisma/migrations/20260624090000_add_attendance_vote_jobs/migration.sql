-- CreateEnum
CREATE TYPE "AttendanceVoteJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "AttendanceVoteJob" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "discordGuildId" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "discordMessageId" TEXT,
    "choice" "AttendanceChoice" NOT NULL,
    "status" "AttendanceVoteJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "processedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceVoteJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceVoteJob_sessionId_discordUserId_key" ON "AttendanceVoteJob"("sessionId", "discordUserId");

-- CreateIndex
CREATE INDEX "AttendanceVoteJob_status_availableAt_createdAt_idx" ON "AttendanceVoteJob"("status", "availableAt", "createdAt");

-- CreateIndex
CREATE INDEX "AttendanceVoteJob_sessionId_status_createdAt_idx" ON "AttendanceVoteJob"("sessionId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AttendanceVoteJob_guildId_status_availableAt_idx" ON "AttendanceVoteJob"("guildId", "status", "availableAt");

-- AddForeignKey
ALTER TABLE "AttendanceVoteJob" ADD CONSTRAINT "AttendanceVoteJob_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AttendanceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
