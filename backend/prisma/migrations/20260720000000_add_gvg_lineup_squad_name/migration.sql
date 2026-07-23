ALTER TABLE "GvgLineupSquad" ADD COLUMN "name" TEXT;

UPDATE "GvgLineupSquad"
SET "name" = 'Tổ đội ' || "squadNumber";

ALTER TABLE "GvgLineupSquad" ALTER COLUMN "name" SET NOT NULL;
