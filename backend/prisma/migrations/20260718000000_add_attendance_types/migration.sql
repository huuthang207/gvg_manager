-- CreateEnum
CREATE TYPE "AttendanceType" AS ENUM ('GVG', 'SCRIM');

-- AlterTable
ALTER TABLE "AttendanceChannelConfig" ADD COLUMN "type" "AttendanceType" NOT NULL DEFAULT 'GVG';
ALTER TABLE "AttendanceSession" ADD COLUMN "type" "AttendanceType" NOT NULL DEFAULT 'GVG';

-- DropIndex
DROP INDEX "AttendanceChannelConfig_guildId_key";
DROP INDEX "AttendanceSession_guildId_status_idx";
DROP INDEX "AttendanceSession_guildId_openedAt_idx";

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceChannelConfig_guildId_type_key" ON "AttendanceChannelConfig"("guildId", "type");
CREATE INDEX "AttendanceChannelConfig_guildId_type_idx" ON "AttendanceChannelConfig"("guildId", "type");
CREATE INDEX "AttendanceSession_guildId_type_status_idx" ON "AttendanceSession"("guildId", "type", "status");
CREATE INDEX "AttendanceSession_guildId_type_openedAt_idx" ON "AttendanceSession"("guildId", "type", "openedAt");
