ALTER TABLE "Guild" ADD COLUMN "gvgLineupNextSquadNumber" INTEGER NOT NULL DEFAULT 1;

UPDATE "Guild" AS guild
SET "gvgLineupNextSquadNumber" = COALESCE((
  SELECT MAX(squad."squadNumber") + 1
  FROM "GvgLineupSquad" AS squad
  WHERE squad."guildId" = guild."id"
), 1);
