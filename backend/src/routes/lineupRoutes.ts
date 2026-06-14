import { Response, Router } from 'express';
import { requireAuth } from '../auth.js';
import { getUserAppState } from '../appState.js';
import { requireAccessibleGuild } from '../permissions.js';
import { publishGuildAppStateChanged } from '../services/realtimeGateway.js';
import { assertLineupEditLock, LineupEditLockError, acquireLineupEditLock, getLineupEditLock, overrideLineupEditLock, releaseLineupEditLock, renewLineupEditLock } from '../services/lineupEditLockService.js';
import {
  createLineupSnapshotFromCurrentGuild,
  deleteLineupSnapshotForGuild,
  getLineupSnapshotDetailForGuild,
  listLineupSnapshotsForGuild,
  overwriteLineupSnapshotFromCurrentGuild,
  persistSquadGroupsForGuild,
  restoreLineupSnapshotToCurrentGuild,
  serializeSnapshotGroups,
} from '../lineupSnapshots.js';

export function createLineupRoutes() {
  const router = Router();

  function sendLineupLockError(res: Response, err: LineupEditLockError) {
    res.status(err.status).json({ error: err.message, lock: err.lock });
  }

  router.get('/api/lineup-lock', async (req, res, next) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const access = await requireAccessibleGuild(auth.user.id, 'view:guild', auth.session.activeGuildId);

      if (!access) {
        res.status(404).json({ error: 'Chưa có server nào được import.' });
        return;
      }

      res.json({ lock: getLineupEditLock(access, auth.user.id) });
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/lineup-lock/acquire', async (req, res, next) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const access = await requireAccessibleGuild(auth.user.id, 'manage:lineup', auth.session.activeGuildId);

      if (!access) {
        res.status(404).json({ error: 'Chưa có server nào được import.' });
        return;
      }

      if (access.forbidden) {
        res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa đội hình.' });
        return;
      }

      try {
        const lock = acquireLineupEditLock(access, auth.user);
        publishGuildAppStateChanged({ guildId: access.guild.id, reason: 'lineup_lock_changed' });
        res.json({ lock });
      } catch (err) {
        if (err instanceof LineupEditLockError) {
          sendLineupLockError(res, err);
          return;
        }
        throw err;
      }
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/lineup-lock/heartbeat', async (req, res, next) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const access = await requireAccessibleGuild(auth.user.id, 'manage:lineup', auth.session.activeGuildId);

      if (!access) {
        res.status(404).json({ error: 'Chưa có server nào được import.' });
        return;
      }

      if (access.forbidden) {
        res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa đội hình.' });
        return;
      }

      try {
        const lock = renewLineupEditLock(access, auth.user);
        res.json({ lock });
      } catch (err) {
        if (err instanceof LineupEditLockError) {
          sendLineupLockError(res, err);
          return;
        }
        throw err;
      }
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/lineup-lock/release', async (req, res, next) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const access = await requireAccessibleGuild(auth.user.id, 'manage:lineup', auth.session.activeGuildId);

      if (!access) {
        res.status(404).json({ error: 'Chưa có server nào được import.' });
        return;
      }

      if (access.forbidden) {
        res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa đội hình.' });
        return;
      }

      try {
        releaseLineupEditLock(access, auth.user);
        publishGuildAppStateChanged({ guildId: access.guild.id, reason: 'lineup_lock_changed' });
        res.json({ lock: null });
      } catch (err) {
        if (err instanceof LineupEditLockError) {
          sendLineupLockError(res, err);
          return;
        }
        throw err;
      }
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/lineup-lock/override', async (req, res, next) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const access = await requireAccessibleGuild(auth.user.id, 'manage:lineup', auth.session.activeGuildId);

      if (!access) {
        res.status(404).json({ error: 'Chưa có server nào được import.' });
        return;
      }

      if (access.forbidden) {
        res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa đội hình.' });
        return;
      }

      try {
        const lock = overrideLineupEditLock(access, auth.user);
        publishGuildAppStateChanged({ guildId: access.guild.id, reason: 'lineup_lock_changed' });
        res.json({ lock });
      } catch (err) {
        if (err instanceof LineupEditLockError) {
          sendLineupLockError(res, err);
          return;
        }
        throw err;
      }
    } catch (err) {
      next(err);
    }
  });

  router.put('/api/squad-layout', async (req, res, next) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const { groups, clearSkillMemberIds } = req.body as {
        groups?: Array<{
          id?: string;
          name?: string;
          leaderMemberId?: string | null;
          teams?: Array<{
            id?: string;
            name?: string;
            memberIds?: string[];
          }>;
        }>;
        clearSkillMemberIds?: string[];
      };
      if (!Array.isArray(groups) || groups.length > 10) {
        res.status(400).json({ error: 'Cấu hình đội hình không hợp lệ.' });
        return;
      }

      const totalTeams = groups.reduce((sum, group) => sum + (Array.isArray(group.teams) ? group.teams.length : 0), 0);
      if (totalTeams > 10) {
        res.status(400).json({ error: 'Tổng số đội không được vượt quá 10.' });
        return;
      }

      if (groups.some(group => !group.name?.trim() || !Array.isArray(group.teams) || group.teams.length === 0)) {
        res.status(400).json({ error: 'Mỗi đoàn phải có tên và tối thiểu 1 đội.' });
        return;
      }

      if (groups.some(group => group.teams!.some(team => !team.name?.trim()))) {
        res.status(400).json({ error: 'Tên đội không được để trống.' });
        return;
      }

      const access = await requireAccessibleGuild(auth.user.id, 'manage:lineup', auth.session.activeGuildId);

      if (!access) {
        res.status(404).json({ error: 'Chưa có server nào được import.' });
        return;
      }

      if (access.forbidden) {
        res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa đội hình.' });
        return;
      }

      try {
        assertLineupEditLock(access, auth.user);
      } catch (err) {
        if (err instanceof LineupEditLockError) {
          sendLineupLockError(res, err);
          return;
        }
        throw err;
      }

      await persistSquadGroupsForGuild(access.guild.id, groups, {
        clearSkillMemberIds: Array.isArray(clearSkillMemberIds) ? clearSkillMemberIds : [],
      });
      publishGuildAppStateChanged({ guildId: access.guild.id, reason: 'lineup_updated' });

      const state = await getUserAppState(auth.user.id, auth.session.activeGuildId);
      res.json(state);
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/lineup-snapshots', async (req, res, next) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const access = await requireAccessibleGuild(auth.user.id, 'view:guild', auth.session.activeGuildId);

      if (!access) {
        res.status(404).json({ error: 'Chưa có server nào được import.' });
        return;
      }

      const snapshots = await listLineupSnapshotsForGuild(access.guild.id);

      res.json({ snapshots });
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/lineup-snapshots', async (req, res, next) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
      if (!name) {
        res.status(400).json({ error: 'Tên đội hình không được để trống.' });
        return;
      }

      const access = await requireAccessibleGuild(auth.user.id, 'manage:snapshots', auth.session.activeGuildId);

      if (!access) {
        res.status(404).json({ error: 'Chưa có server nào được import.' });
        return;
      }

      if (access.forbidden) {
        res.status(403).json({ error: 'Bạn không có quyền lưu đội hình.' });
        return;
      }

      const snapshot = await createLineupSnapshotFromCurrentGuild(access.guild.id, name);
      publishGuildAppStateChanged({ guildId: access.guild.id, reason: 'snapshot_saved' });
      res.json({
        id: snapshot.id,
        name: snapshot.name,
        createdAt: snapshot.createdAt.toISOString(),
        updatedAt: snapshot.updatedAt.toISOString(),
        groups: serializeSnapshotGroups(snapshot.groups),
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/lineup-snapshots/:snapshotId', async (req, res, next) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const access = await requireAccessibleGuild(auth.user.id, 'view:guild', auth.session.activeGuildId);

      if (!access) {
        res.status(404).json({ error: 'Chưa có server nào được import.' });
        return;
      }

      const snapshot = await getLineupSnapshotDetailForGuild(access.guild.id, req.params.snapshotId);

      if (!snapshot) {
        res.status(404).json({ error: 'Không tìm thấy đội hình đã lưu.' });
        return;
      }

      res.json(snapshot);
    } catch (err) {
      next(err);
    }
  });

  router.put('/api/lineup-snapshots/:snapshotId', async (req, res, next) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
      if (!name) {
        res.status(400).json({ error: 'Tên đội hình không được để trống.' });
        return;
      }

      const access = await requireAccessibleGuild(auth.user.id, 'manage:snapshots', auth.session.activeGuildId);

      if (!access) {
        res.status(404).json({ error: 'Chưa có server nào được import.' });
        return;
      }

      if (access.forbidden) {
        res.status(403).json({ error: 'Bạn không có quyền ghi đè đội hình đã lưu.' });
        return;
      }

      const snapshot = await overwriteLineupSnapshotFromCurrentGuild(access.guild.id, req.params.snapshotId, name);
      publishGuildAppStateChanged({ guildId: access.guild.id, reason: 'snapshot_saved' });
      res.json({
        id: snapshot.id,
        name: snapshot.name,
        createdAt: snapshot.createdAt.toISOString(),
        updatedAt: snapshot.updatedAt.toISOString(),
        groups: serializeSnapshotGroups(snapshot.groups),
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/lineup-snapshots/:snapshotId/restore', async (req, res, next) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const access = await requireAccessibleGuild(auth.user.id, 'restore:snapshots', auth.session.activeGuildId);

      if (!access) {
        res.status(404).json({ error: 'Chưa có server nào được import.' });
        return;
      }

      if (access.forbidden) {
        res.status(403).json({ error: 'Bạn không có quyền khôi phục đội hình đã lưu.' });
        return;
      }

      try {
        assertLineupEditLock(access, auth.user);
      } catch (err) {
        if (err instanceof LineupEditLockError) {
          sendLineupLockError(res, err);
          return;
        }
        throw err;
      }

      await restoreLineupSnapshotToCurrentGuild(access.guild.id, req.params.snapshotId);
      publishGuildAppStateChanged({ guildId: access.guild.id, reason: 'snapshot_restored' });

      const state = await getUserAppState(auth.user.id, auth.session.activeGuildId);
      res.json(state);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/api/lineup-snapshots/:snapshotId', async (req, res, next) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const access = await requireAccessibleGuild(auth.user.id, 'manage:snapshots', auth.session.activeGuildId);

      if (!access) {
        res.status(404).json({ error: 'Chưa có server nào được import.' });
        return;
      }

      if (access.forbidden) {
        res.status(403).json({ error: 'Bạn không có quyền xóa đội hình đã lưu.' });
        return;
      }

      const deleted = await deleteLineupSnapshotForGuild(access.guild.id, req.params.snapshotId);

      if (deleted.count === 0) {
        res.status(404).json({ error: 'Không tìm thấy đội hình đã lưu.' });
        return;
      }

      publishGuildAppStateChanged({ guildId: access.guild.id, reason: 'snapshot_deleted' });

      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
