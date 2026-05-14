-- CreateTable
CREATE TABLE "LineupSnapshot" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LineupSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineupSnapshotGroup" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "leaderMemberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LineupSnapshotGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineupSnapshotTeam" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LineupSnapshotTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineupSnapshotSlot" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "slotType" TEXT NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "memberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LineupSnapshotSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LineupSnapshotGroup_snapshotId_orderIndex_key" ON "LineupSnapshotGroup"("snapshotId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "LineupSnapshotTeam_groupId_orderIndex_key" ON "LineupSnapshotTeam"("groupId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "LineupSnapshotSlot_teamId_slotType_slotIndex_key" ON "LineupSnapshotSlot"("teamId", "slotType", "slotIndex");

-- AddForeignKey
ALTER TABLE "LineupSnapshot" ADD CONSTRAINT "LineupSnapshot_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineupSnapshotGroup" ADD CONSTRAINT "LineupSnapshotGroup_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "LineupSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineupSnapshotGroup" ADD CONSTRAINT "LineupSnapshotGroup_leaderMemberId_fkey" FOREIGN KEY ("leaderMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineupSnapshotTeam" ADD CONSTRAINT "LineupSnapshotTeam_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "LineupSnapshotGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineupSnapshotSlot" ADD CONSTRAINT "LineupSnapshotSlot_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "LineupSnapshotTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineupSnapshotSlot" ADD CONSTRAINT "LineupSnapshotSlot_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
