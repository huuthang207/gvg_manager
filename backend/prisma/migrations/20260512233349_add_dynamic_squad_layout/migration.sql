-- CreateTable
CREATE TABLE "SquadGroup" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SquadGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SquadTeam" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SquadTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SquadTeamSlot" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "slotType" TEXT NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "memberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SquadTeamSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SquadGroup_guildId_orderIndex_key" ON "SquadGroup"("guildId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "SquadTeam_groupId_orderIndex_key" ON "SquadTeam"("groupId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "SquadTeamSlot_teamId_slotType_slotIndex_key" ON "SquadTeamSlot"("teamId", "slotType", "slotIndex");

-- AddForeignKey
ALTER TABLE "SquadGroup" ADD CONSTRAINT "SquadGroup_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadTeam" ADD CONSTRAINT "SquadTeam_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SquadGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadTeamSlot" ADD CONSTRAINT "SquadTeamSlot_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "SquadTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadTeamSlot" ADD CONSTRAINT "SquadTeamSlot_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
