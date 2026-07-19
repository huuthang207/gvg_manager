-- This migration permanently removes the retired lineup planning and lineup-only skill domain.
-- Take and verify a database backup before applying in production.

DROP TABLE IF EXISTS "LineupSnapshotSlot";
DROP TABLE IF EXISTS "LineupSnapshotTeam";
DROP TABLE IF EXISTS "LineupSnapshotGroup";
DROP TABLE IF EXISTS "LineupSnapshot";
DROP TABLE IF EXISTS "SquadTeamSlot";
DROP TABLE IF EXISTS "SquadTeam";
DROP TABLE IF EXISTS "SquadGroup";
DROP TABLE IF EXISTS "TeamSlot";
DROP TABLE IF EXISTS "Team";
DROP TABLE IF EXISTS "MemberSkill";
DROP TABLE IF EXISTS "Skill";

DROP TYPE IF EXISTS "DivisionType";
DROP TYPE IF EXISTS "SlotType";
