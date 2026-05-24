ALTER TABLE "GvgParticipationEntry" ADD COLUMN "battleNumbers" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

UPDATE "GvgParticipationEntry" AS entry
SET "battleNumbers" = COALESCE(backfill."battleNumbers", ARRAY[]::INTEGER[])
FROM (
  SELECT
    entry."id",
    ARRAY(
      SELECT generate_series(1, LEAST(GREATEST(entry."count", 0), GREATEST(session."battleCount", 0)))
    )::INTEGER[] AS "battleNumbers"
  FROM "GvgParticipationEntry" AS entry
  INNER JOIN "GvgParticipationSession" AS session ON session."id" = entry."sessionId"
) AS backfill
WHERE backfill."id" = entry."id";
