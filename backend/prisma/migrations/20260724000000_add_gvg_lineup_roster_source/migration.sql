ALTER TABLE "Guild" ADD COLUMN "gvgLineupRosterSessionId" TEXT;

CREATE UNIQUE INDEX "Guild_gvgLineupRosterSessionId_key" ON "Guild"("gvgLineupRosterSessionId");

ALTER TABLE "Guild" ADD CONSTRAINT "Guild_gvgLineupRosterSessionId_fkey"
  FOREIGN KEY ("gvgLineupRosterSessionId") REFERENCES "AttendanceSession"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
