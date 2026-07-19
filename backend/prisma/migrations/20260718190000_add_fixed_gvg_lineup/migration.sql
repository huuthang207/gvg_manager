-- CreateTable
CREATE TABLE "GvgLineupDivision" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GvgLineupDivision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GvgLineupSquad" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "divisionId" TEXT NOT NULL,
    "squadNumber" INTEGER NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GvgLineupSquad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GvgLineupSlot" (
    "id" TEXT NOT NULL,
    "squadId" TEXT NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "memberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GvgLineupSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GvgLineupDivision_guildId_orderIndex_key" ON "GvgLineupDivision"("guildId", "orderIndex");
CREATE INDEX "GvgLineupDivision_guildId_idx" ON "GvgLineupDivision"("guildId");
CREATE UNIQUE INDEX "GvgLineupSquad_guildId_squadNumber_key" ON "GvgLineupSquad"("guildId", "squadNumber");
CREATE UNIQUE INDEX "GvgLineupSquad_divisionId_orderIndex_key" ON "GvgLineupSquad"("divisionId", "orderIndex");
CREATE INDEX "GvgLineupSquad_guildId_idx" ON "GvgLineupSquad"("guildId");
CREATE INDEX "GvgLineupSquad_divisionId_idx" ON "GvgLineupSquad"("divisionId");
CREATE UNIQUE INDEX "GvgLineupSlot_squadId_slotIndex_key" ON "GvgLineupSlot"("squadId", "slotIndex");
CREATE INDEX "GvgLineupSlot_memberId_idx" ON "GvgLineupSlot"("memberId");

-- AddForeignKey
ALTER TABLE "GvgLineupDivision" ADD CONSTRAINT "GvgLineupDivision_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GvgLineupSquad" ADD CONSTRAINT "GvgLineupSquad_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GvgLineupSquad" ADD CONSTRAINT "GvgLineupSquad_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "GvgLineupDivision"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GvgLineupSlot" ADD CONSTRAINT "GvgLineupSlot_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "GvgLineupSquad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GvgLineupSlot" ADD CONSTRAINT "GvgLineupSlot_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
