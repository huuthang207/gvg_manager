-- CreateEnum
CREATE TYPE "AttendanceChoice" AS ENUM ('GO', 'MAYBE', 'NOGO');

-- CreateEnum
CREATE TYPE "AttendanceSessionStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "AttendanceChannelConfig" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "discordChannelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceChannelConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceSession" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "status" "AttendanceSessionStatus" NOT NULL DEFAULT 'OPEN',
    "headerText" TEXT,
    "discordChannelId" TEXT,
    "discordMessageId" TEXT,
    "openedByDiscordUserId" TEXT,
    "closedByDiscordUserId" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "lastRenderedAt" TIMESTAMP(3),
    "lastVoteAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceVote" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "choice" "AttendanceChoice" NOT NULL,
    "snapshotIngameName" TEXT,
    "snapshotClassType" TEXT,
    "votedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceChannelConfig_guildId_key" ON "AttendanceChannelConfig"("guildId");

-- CreateIndex
CREATE INDEX "AttendanceSession_guildId_status_idx" ON "AttendanceSession"("guildId", "status");

-- CreateIndex
CREATE INDEX "AttendanceSession_guildId_openedAt_idx" ON "AttendanceSession"("guildId", "openedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceVote_sessionId_memberId_key" ON "AttendanceVote"("sessionId", "memberId");

-- CreateIndex
CREATE INDEX "AttendanceVote_sessionId_choice_idx" ON "AttendanceVote"("sessionId", "choice");

-- AddForeignKey
ALTER TABLE "AttendanceChannelConfig" ADD CONSTRAINT "AttendanceChannelConfig_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceVote" ADD CONSTRAINT "AttendanceVote_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AttendanceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceVote" ADD CONSTRAINT "AttendanceVote_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
