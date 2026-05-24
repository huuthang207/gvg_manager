-- CreateTable
CREATE TABLE "GvgParticipationSession" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "battleDate" TIMESTAMP(3) NOT NULL,
    "battleCount" INTEGER NOT NULL,
    "finalizedByDiscordUserId" TEXT,
    "finalizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GvgParticipationSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GvgParticipationEntry" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "snapshotIngameName" TEXT,
    "snapshotClassType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GvgParticipationEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GvgParticipationSession_guildId_battleDate_key" ON "GvgParticipationSession"("guildId", "battleDate");

-- CreateIndex
CREATE INDEX "GvgParticipationSession_guildId_battleDate_idx" ON "GvgParticipationSession"("guildId", "battleDate");

-- CreateIndex
CREATE UNIQUE INDEX "GvgParticipationEntry_sessionId_memberId_key" ON "GvgParticipationEntry"("sessionId", "memberId");

-- CreateIndex
CREATE INDEX "GvgParticipationEntry_memberId_idx" ON "GvgParticipationEntry"("memberId");

-- CreateIndex
CREATE INDEX "GvgParticipationEntry_sessionId_idx" ON "GvgParticipationEntry"("sessionId");

-- AddForeignKey
ALTER TABLE "GvgParticipationSession" ADD CONSTRAINT "GvgParticipationSession_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GvgParticipationEntry" ADD CONSTRAINT "GvgParticipationEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GvgParticipationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GvgParticipationEntry" ADD CONSTRAINT "GvgParticipationEntry_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
