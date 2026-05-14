-- AlterTable
ALTER TABLE "SquadGroup" ADD COLUMN     "leaderMemberId" TEXT;

-- AddForeignKey
ALTER TABLE "SquadGroup" ADD CONSTRAINT "SquadGroup_leaderMemberId_fkey" FOREIGN KEY ("leaderMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
