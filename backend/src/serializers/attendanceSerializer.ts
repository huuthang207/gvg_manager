import type { AttendanceChoice, AttendanceSessionStatus, AttendanceType } from '@prisma/client';

type AttendanceVoteRow = {
  id: string;
  memberId: string;
  choice: AttendanceChoice;
  snapshotIngameName: string | null;
  snapshotClassType: string | null;
  votedAt: Date;
  updatedAt: Date;
  member: {
    id: string;
    discordUserId: string;
    username: string;
    displayName: string;
    ingameName: string | null;
    classType: string;
    avatar: string | null;
    active: boolean;
  };
};

type AttendanceSessionRow = {
  id: string;
  guildId: string;
  type?: AttendanceType;
  status: AttendanceSessionStatus;
  headerText: string | null;
  discordChannelId: string | null;
  discordMessageId: string | null;
  openedByDiscordUserId: string | null;
  closedByDiscordUserId: string | null;
  openedAt: Date;
  closedAt: Date | null;
  lastRenderedAt: Date | null;
  lastVoteAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  votes?: AttendanceVoteRow[];
};

export function summarizeAttendanceVotes(votes: Array<{ choice: AttendanceChoice }>) {
  return votes.reduce(
    (summary, vote) => {
      if (vote.choice === 'GO') summary.go += 1;
      if (vote.choice === 'NOGO') summary.nogo += 1;
      summary.total += 1;
      return summary;
    },
    { go: 0, nogo: 0, total: 0 },
  );
}

export function serializeAttendanceVote(vote: AttendanceVoteRow) {
  return {
    id: vote.id,
    memberId: vote.memberId,
    choice: vote.choice,
    snapshotIngameName: vote.snapshotIngameName,
    snapshotClassType: vote.snapshotClassType,
    votedAt: vote.votedAt.toISOString(),
    updatedAt: vote.updatedAt.toISOString(),
    member: {
      id: vote.member.id,
      discordUserId: vote.member.discordUserId,
      username: vote.member.username,
      displayName: vote.member.displayName,
      ingameName: vote.member.ingameName,
      classType: vote.member.classType,
      avatar: vote.member.avatar,
      active: vote.member.active,
    },
  };
}

export function serializeAttendanceSession(session: AttendanceSessionRow) {
  const votes = session.votes ?? [];
  return {
    id: session.id,
    guildId: session.guildId,
    type: session.type ?? 'GVG',
    status: session.status,
    headerText: session.headerText,
    discordChannelId: session.discordChannelId,
    discordMessageId: session.discordMessageId,
    openedByDiscordUserId: session.openedByDiscordUserId,
    closedByDiscordUserId: session.closedByDiscordUserId,
    openedAt: session.openedAt.toISOString(),
    closedAt: session.closedAt?.toISOString() ?? null,
    lastRenderedAt: session.lastRenderedAt?.toISOString() ?? null,
    lastVoteAt: session.lastVoteAt?.toISOString() ?? null,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    summary: summarizeAttendanceVotes(votes),
    votes: votes.map(serializeAttendanceVote),
  };
}
