# Remove lineup planning release runbook

## Before deployment

1. Take a restorable PostgreSQL backup and verify that it can be restored in a non-production environment.
2. Record row counts for the data being permanently removed:

   ```sql
   SELECT 'Team' AS table_name, COUNT(*) FROM "Team"
   UNION ALL SELECT 'TeamSlot', COUNT(*) FROM "TeamSlot"
   UNION ALL SELECT 'SquadGroup', COUNT(*) FROM "SquadGroup"
   UNION ALL SELECT 'SquadTeam', COUNT(*) FROM "SquadTeam"
   UNION ALL SELECT 'SquadTeamSlot', COUNT(*) FROM "SquadTeamSlot"
   UNION ALL SELECT 'LineupSnapshot', COUNT(*) FROM "LineupSnapshot"
   UNION ALL SELECT 'LineupSnapshotGroup', COUNT(*) FROM "LineupSnapshotGroup"
   UNION ALL SELECT 'LineupSnapshotTeam', COUNT(*) FROM "LineupSnapshotTeam"
   UNION ALL SELECT 'LineupSnapshotSlot', COUNT(*) FROM "LineupSnapshotSlot"
   UNION ALL SELECT 'Skill', COUNT(*) FROM "Skill"
   UNION ALL SELECT 'MemberSkill', COUNT(*) FROM "MemberSkill";
   ```

3. Apply the migration in a staging copy and run backend tests, backend type-check, frontend type-check, and frontend production build.
4. Schedule frontend and backend deployment together: clients from before the release will receive 404 responses for removed lineup endpoints.

## Deployment

1. Deploy the backend containing the forward Prisma migration and run `npm run prisma:migrate:deploy` from `backend/`.
2. Deploy the frontend in the same release.
3. Confirm users with `gvg_active_tab_<user>_<guild> = teams` are redirected to the dashboard and the stored value is normalized.

## Post-deployment smoke test

- Log in and switch guilds.
- Verify member listing, edit, role management, soft delete, and hard delete.
- Verify attendance channel configuration, open, GO/NOGO vote through Discord, message refresh, close, history/detail, and history deletion.
- Verify GvG participation selection from attendance and monthly deletion.
- Verify guild reset and WebSocket member/attendance/GvG updates.
- Confirm no Sắp Xếp Đội Hình navigation, app-state fields, API routes, or database tables remain.

## Recovery

The migration deletes data permanently. Code rollback alone cannot restore lineup or skill data. If recovery is required, stop the deployment and restore the pre-deploy database backup, then deploy the previous application version.
