import { AttendanceVoteJobStatus, type AttendanceChoice } from '@prisma/client';
import { prisma } from '../db.js';
import { queueAttendanceDiscordMessageRefresh } from './attendanceDiscordService.js';
import { persistAttendanceVote } from './attendanceService.js';

const attendanceVoteWorkerDebugEnabled = process.env.DISCORD_ATTENDANCE_DEBUG === 'true' || process.env.DISCORD_REALTIME_DEBUG === 'true';
const workerTimers = new Set<ReturnType<typeof setTimeout>>();
let attendanceVoteWorkerStarted = false;
let attendanceVoteWorkerRunning = false;

function logAttendanceVoteWorker(message: string, details?: Record<string, unknown>) {
  if (!attendanceVoteWorkerDebugEnabled) return;
  if (details) {
    console.log(`[Attendance Vote Worker] ${message}`, details);
    return;
  }
  console.log(`[Attendance Vote Worker] ${message}`);
}

function getAttendanceVoteWorkerId() {
  return process.env.INSTANCE_ID || process.env.RAILWAY_REPLICA_ID || process.env.HOSTNAME || `pid-${process.pid}`;
}

function getAttendanceVoteWorkerIntervalMs() {
  const parsed = Number(process.env.ATTENDANCE_VOTE_WORKER_INTERVAL_MS ?? 1000);
  return Number.isFinite(parsed) ? Math.max(250, parsed) : 1000;
}

function getAttendanceVoteWorkerBatchSize() {
  const parsed = Number(process.env.ATTENDANCE_VOTE_WORKER_BATCH_SIZE ?? 10);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(50, parsed)) : 10;
}

function getAttendanceVoteWorkerLockTimeoutMs() {
  const parsed = Number(process.env.ATTENDANCE_VOTE_WORKER_LOCK_TIMEOUT_MS ?? 60000);
  return Number.isFinite(parsed) ? Math.max(1000, parsed) : 60000;
}

function getAttendanceVoteWorkerMaxAttempts() {
  const parsed = Number(process.env.ATTENDANCE_VOTE_WORKER_MAX_ATTEMPTS ?? 4);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(20, parsed)) : 4;
}

function getRetryDelayMs(attempts: number) {
  if (attempts <= 1) return 2000;
  if (attempts === 2) return 10000;
  if (attempts === 3) return 30000;
  return 60000;
}

function isRetryableAttendanceVoteResult(result: { status: number }) {
  return result.status >= 500;
}

export async function enqueueAttendanceVoteJob(input: {
  sessionId: string;
  discordGuildId: string;
  discordUserId: string;
  choice: AttendanceChoice;
  discordMessageId?: string | null;
}) {
  const session = await prisma.attendanceSession.findUnique({
    where: { id: input.sessionId },
    select: {
      id: true,
      guildId: true,
      guild: {
        select: {
          discordGuildId: true,
        },
      },
    },
  });

  if (!session || session.guild.discordGuildId !== input.discordGuildId) {
    return { status: 404 as const, body: { error: 'Phiên điểm danh không tồn tại hoặc không thuộc server Discord hiện tại.' } };
  }

  const now = new Date();
  const job = await prisma.attendanceVoteJob.upsert({
    where: {
      sessionId_discordUserId: {
        sessionId: input.sessionId,
        discordUserId: input.discordUserId,
      },
    },
    update: {
      discordGuildId: input.discordGuildId,
      guildId: session.guildId,
      discordMessageId: input.discordMessageId ?? null,
      choice: input.choice,
      status: AttendanceVoteJobStatus.PENDING,
      availableAt: now,
      lockedAt: null,
      lockedBy: null,
      processedAt: null,
      lastError: null,
    },
    create: {
      sessionId: input.sessionId,
      guildId: session.guildId,
      discordGuildId: input.discordGuildId,
      discordUserId: input.discordUserId,
      discordMessageId: input.discordMessageId ?? null,
      choice: input.choice,
      status: AttendanceVoteJobStatus.PENDING,
      availableAt: now,
    },
  });

  logAttendanceVoteWorker('Enqueued attendance vote job', {
    jobId: job.id,
    sessionId: job.sessionId,
    discordGuildId: job.discordGuildId,
    discordUserId: job.discordUserId,
    choice: job.choice,
  });

  return {
    status: 202 as const,
    body: {
      jobId: job.id,
      sessionId: job.sessionId,
      choice: job.choice,
    },
  };
}

export async function claimAttendanceVoteJobs(limit = getAttendanceVoteWorkerBatchSize(), workerId = getAttendanceVoteWorkerId()) {
  const now = new Date();
  const staleThreshold = new Date(now.getTime() - getAttendanceVoteWorkerLockTimeoutMs());

  const candidates = await prisma.attendanceVoteJob.findMany({
    where: {
      OR: [
        {
          status: AttendanceVoteJobStatus.PENDING,
          availableAt: { lte: now },
        },
        {
          status: AttendanceVoteJobStatus.PROCESSING,
          lockedAt: { lt: staleThreshold },
        },
      ],
    },
    orderBy: [
      { availableAt: 'asc' },
      { createdAt: 'asc' },
    ],
    take: limit,
  });

  const claimedJobs = [] as NonNullable<Awaited<ReturnType<typeof prisma.attendanceVoteJob.findUnique>>>[];

  for (const candidate of candidates) {
    const claimed = await prisma.attendanceVoteJob.updateMany({
      where: {
        id: candidate.id,
        OR: [
          {
            status: AttendanceVoteJobStatus.PENDING,
            availableAt: { lte: now },
          },
          {
            status: AttendanceVoteJobStatus.PROCESSING,
            lockedAt: { lt: staleThreshold },
          },
        ],
      },
      data: {
        status: AttendanceVoteJobStatus.PROCESSING,
        attempts: { increment: 1 },
        lockedAt: now,
        lockedBy: workerId,
        lastError: null,
      },
    });

    if (claimed.count === 0) continue;

    const job = await prisma.attendanceVoteJob.findUnique({ where: { id: candidate.id } });
    if (job) {
      claimedJobs.push(job);
    }
  }

  if (claimedJobs.length > 0) {
    logAttendanceVoteWorker('Claimed attendance vote jobs', {
      workerId,
      jobIds: claimedJobs.map(job => job?.id),
    });
  }

  return claimedJobs;
}

export async function processAttendanceVoteJob(job: {
  id: string;
  sessionId: string;
  guildId: string;
  discordGuildId: string;
  discordUserId: string;
  discordMessageId: string | null;
  choice: AttendanceChoice;
  attempts: number;
}, workerId = getAttendanceVoteWorkerId()) {
  try {
    const result = await persistAttendanceVote({
      discordGuildId: job.discordGuildId,
      discordUserId: job.discordUserId,
      sessionId: job.sessionId,
      choice: job.choice,
      discordMessageId: job.discordMessageId,
    });

    if (result.status === 200) {
      await prisma.attendanceVoteJob.update({
        where: { id: job.id },
        data: {
          status: AttendanceVoteJobStatus.SUCCEEDED,
          lockedAt: null,
          lockedBy: null,
          processedAt: new Date(),
          lastError: null,
        },
      });

      queueAttendanceDiscordMessageRefresh({
        sessionId: result.body.refreshTarget.sessionId,
        discordChannelId: result.body.refreshTarget.discordChannelId,
        discordMessageId: result.body.refreshTarget.discordMessageId,
        closed: false,
        reason: 'vote',
      });

      logAttendanceVoteWorker('Processed attendance vote job successfully', {
        workerId,
        jobId: job.id,
        sessionId: job.sessionId,
        discordUserId: job.discordUserId,
        choice: job.choice,
      });
      return { ok: true as const, result };
    }

    const nextAttempts = job.attempts;
    const shouldRetry = isRetryableAttendanceVoteResult(result) && nextAttempts < getAttendanceVoteWorkerMaxAttempts();

    await prisma.attendanceVoteJob.update({
      where: { id: job.id },
      data: shouldRetry
        ? {
          status: AttendanceVoteJobStatus.PENDING,
          availableAt: new Date(Date.now() + getRetryDelayMs(nextAttempts)),
          lockedAt: null,
          lockedBy: null,
          lastError: result.body.error || `Attendance vote failed with status ${result.status}`,
        }
        : {
          status: AttendanceVoteJobStatus.FAILED,
          lockedAt: null,
          lockedBy: null,
          processedAt: new Date(),
          lastError: result.body.error || `Attendance vote failed with status ${result.status}`,
        },
    });

    logAttendanceVoteWorker(shouldRetry ? 'Attendance vote job scheduled for retry' : 'Attendance vote job failed permanently', {
      workerId,
      jobId: job.id,
      sessionId: job.sessionId,
      discordUserId: job.discordUserId,
      choice: job.choice,
      attempts: nextAttempts,
      status: result.status,
      error: result.body.error,
    });

    return { ok: false as const, result, retrying: shouldRetry };
  } catch (err) {
    const nextAttempts = job.attempts;
    const shouldRetry = nextAttempts < getAttendanceVoteWorkerMaxAttempts();
    const lastError = err instanceof Error ? err.message : String(err);

    await prisma.attendanceVoteJob.update({
      where: { id: job.id },
      data: shouldRetry
        ? {
          status: AttendanceVoteJobStatus.PENDING,
          availableAt: new Date(Date.now() + getRetryDelayMs(nextAttempts)),
          lockedAt: null,
          lockedBy: null,
          lastError,
        }
        : {
          status: AttendanceVoteJobStatus.FAILED,
          lockedAt: null,
          lockedBy: null,
          processedAt: new Date(),
          lastError,
        },
    });

    logAttendanceVoteWorker(shouldRetry ? 'Attendance vote job threw and will retry' : 'Attendance vote job threw and failed permanently', {
      workerId,
      jobId: job.id,
      sessionId: job.sessionId,
      discordUserId: job.discordUserId,
      choice: job.choice,
      attempts: nextAttempts,
      error: lastError,
    });

    return { ok: false as const, retrying: shouldRetry, error: lastError };
  }
}

export async function runAttendanceVoteWorkerBatch() {
  if (attendanceVoteWorkerRunning) return 0;

  attendanceVoteWorkerRunning = true;
  const workerId = getAttendanceVoteWorkerId();

  try {
    const jobs = await claimAttendanceVoteJobs(getAttendanceVoteWorkerBatchSize(), workerId);
    for (const job of jobs) {
      await processAttendanceVoteJob(job, workerId);
    }
    return jobs.length;
  } finally {
    attendanceVoteWorkerRunning = false;
  }
}

export function startAttendanceVoteWorker() {
  if (attendanceVoteWorkerStarted || process.env.ATTENDANCE_VOTE_WORKER_ENABLED === 'false') {
    return;
  }

  attendanceVoteWorkerStarted = true;

  const intervalMs = getAttendanceVoteWorkerIntervalMs();
  const loop = async () => {
    try {
      await runAttendanceVoteWorkerBatch();
    } catch (err) {
      console.error('[Attendance Vote Worker] Batch failed:', err instanceof Error ? err.message : err);
    } finally {
      const timer = setTimeout(() => {
        workerTimers.delete(timer);
        void loop();
      }, intervalMs);
      workerTimers.add(timer);
    }
  };

  void loop();
}

export function __resetAttendanceVoteWorkerForTests() {
  attendanceVoteWorkerStarted = false;
  attendanceVoteWorkerRunning = false;
  workerTimers.forEach(timer => clearTimeout(timer));
  workerTimers.clear();
}
