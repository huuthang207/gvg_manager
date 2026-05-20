import { AccessibleGuild, GuildRole } from '../permissions.js';

const LINEUP_EDIT_LOCK_TTL_MS = Number(process.env.LINEUP_EDIT_LOCK_TTL_MS ?? 60000);

type LineupEditLockRecord = {
  guildId: string;
  holderUserId: string;
  holderDiscordUserId: string;
  holderName: string;
  holderRole: GuildRole;
  acquiredAt: number;
  expiresAt: number;
};

export type SerializedLineupEditLock = {
  guildId: string;
  holderUserId: string;
  holderDiscordUserId: string;
  holderName: string;
  holderRole: GuildRole;
  acquiredAt: string;
  expiresAt: string;
  isHeldByMe: boolean;
  canOverride: boolean;
};

export class LineupEditLockError extends Error {
  status: number;
  lock: SerializedLineupEditLock | null;

  constructor(message: string, status: number, lock: SerializedLineupEditLock | null) {
    super(message);
    this.status = status;
    this.lock = lock;
  }
}

type LockUser = {
  id: string;
  discordUserId: string;
  username: string;
  globalName: string | null;
};

const lineupEditLocks = new Map<string, LineupEditLockRecord>();

function nowMs() {
  return Date.now();
}

function getHolderName(user: LockUser) {
  return user.globalName || user.username;
}

function serializeLock(lock: LineupEditLockRecord, requesterUserId?: string | null, requesterRole?: GuildRole | null): SerializedLineupEditLock {
  return {
    guildId: lock.guildId,
    holderUserId: lock.holderUserId,
    holderDiscordUserId: lock.holderDiscordUserId,
    holderName: lock.holderName,
    holderRole: lock.holderRole,
    acquiredAt: new Date(lock.acquiredAt).toISOString(),
    expiresAt: new Date(lock.expiresAt).toISOString(),
    isHeldByMe: lock.holderUserId === requesterUserId,
    canOverride: requesterRole === 'owner' && lock.holderUserId !== requesterUserId,
  };
}

function getActiveLockRecord(guildId: string) {
  const lock = lineupEditLocks.get(guildId);
  if (!lock) return null;

  if (lock.expiresAt <= nowMs()) {
    lineupEditLocks.delete(guildId);
    return null;
  }

  return lock;
}

function createLock(access: AccessibleGuild, user: LockUser): LineupEditLockRecord {
  const acquiredAt = nowMs();
  const lock = {
    guildId: access.guild.id,
    holderUserId: user.id,
    holderDiscordUserId: user.discordUserId,
    holderName: getHolderName(user),
    holderRole: access.role,
    acquiredAt,
    expiresAt: acquiredAt + LINEUP_EDIT_LOCK_TTL_MS,
  };
  lineupEditLocks.set(access.guild.id, lock);
  return lock;
}

export function getLineupEditLock(access: AccessibleGuild | { guild: { id: string }; role?: GuildRole } | null, requesterUserId?: string | null) {
  if (!access) return null;
  const lock = getActiveLockRecord(access.guild.id);
  return lock ? serializeLock(lock, requesterUserId, access.role ?? null) : null;
}

export function acquireLineupEditLock(access: AccessibleGuild, user: LockUser) {
  const lock = getActiveLockRecord(access.guild.id);
  if (lock && lock.holderUserId !== user.id) {
    throw new LineupEditLockError('Đội hình đang được chỉnh sửa bởi người khác.', 409, serializeLock(lock, user.id, access.role));
  }

  return serializeLock(createLock(access, user), user.id, access.role);
}

export function renewLineupEditLock(access: AccessibleGuild, user: LockUser) {
  const lock = getActiveLockRecord(access.guild.id);
  if (!lock || lock.holderUserId !== user.id) {
    throw new LineupEditLockError('Bạn chưa giữ quyền chỉnh sửa đội hình.', 423, lock ? serializeLock(lock, user.id, access.role) : null);
  }

  lock.expiresAt = nowMs() + LINEUP_EDIT_LOCK_TTL_MS;
  lineupEditLocks.set(access.guild.id, lock);
  return serializeLock(lock, user.id, access.role);
}

export function releaseLineupEditLock(access: AccessibleGuild, user: LockUser) {
  const lock = getActiveLockRecord(access.guild.id);
  if (!lock) return null;

  if (lock.holderUserId === user.id) {
    lineupEditLocks.delete(access.guild.id);
    return null;
  }

  throw new LineupEditLockError('Bạn không phải người đang chỉnh sửa đội hình.', 423, serializeLock(lock, user.id, access.role));
}

export function overrideLineupEditLock(access: AccessibleGuild, user: LockUser) {
  if (access.role !== 'owner') {
    throw new LineupEditLockError('Chỉ bang chủ có thể chiếm quyền chỉnh sửa đội hình.', 403, getLineupEditLock(access, user.id));
  }

  return serializeLock(createLock(access, user), user.id, access.role);
}

export function assertLineupEditLock(access: AccessibleGuild, user: LockUser) {
  const lock = getActiveLockRecord(access.guild.id);
  if (lock?.holderUserId === user.id) return;

  throw new LineupEditLockError('Bạn cần bắt đầu chỉnh sửa trước khi thay đổi đội hình.', 423, lock ? serializeLock(lock, user.id, access.role) : null);
}
