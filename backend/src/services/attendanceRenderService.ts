import type { AttendanceChoice, AttendanceSessionStatus, AttendanceType } from '@prisma/client';

const CLASS_ORDER = [
  'Toái Mộng',
  'Huyết Hà',
  'Thiết Y',
  'Cửu Linh',
  'Thần Tương',
  'Tố Vấn',
  'Long Ngâm',
];

type RenderVote = {
  choice: AttendanceChoice;
  snapshotIngameName: string | null;
  snapshotClassType: string | null;
  updatedAt: Date;
  member?: {
    displayName: string;
    ingameName: string | null;
    classType: string;
  };
};

type RenderSession = {
  type?: AttendanceType;
  headerText: string | null;
  status: AttendanceSessionStatus;
  lastRenderedAt: Date | null;
  lastVoteAt: Date | null;
  updatedAt: Date;
};

export type AttendanceRenderOptions = {
  identitySource?: 'vote_snapshot' | 'live_member';
};

function getVoteName(vote: RenderVote, options: AttendanceRenderOptions = {}) {
  if (options.identitySource === 'live_member') {
    return vote.member?.ingameName || vote.member?.displayName || vote.snapshotIngameName || 'Unknown';
  }
  return vote.snapshotIngameName || vote.member?.ingameName || vote.member?.displayName || 'Unknown';
}

function getVoteClass(vote: RenderVote, options: AttendanceRenderOptions = {}) {
  if (options.identitySource === 'live_member') {
    return vote.member?.classType || vote.snapshotClassType || 'Unknown';
  }
  return vote.snapshotClassType || vote.member?.classType || 'Unknown';
}

function sortClasses(classNames: string[]) {
  return [
    ...CLASS_ORDER.filter(className => classNames.includes(className)),
    ...classNames.filter(className => !CLASS_ORDER.includes(className)).sort((a, b) => a.localeCompare(b, 'vi')),
  ];
}

function formatVietnameseDate(date: Date | null) {
  if (!date) return '-';
  return date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

export function summarizeAttendanceRenderVotes(votes: RenderVote[]) {
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

function renderSummary(votes: RenderVote[]) {
  const summary = summarizeAttendanceRenderVotes(votes);

  return [
    '```txt',
    `🗳️ Tổng vote: ${summary.total}`,
    `✅ Tham gia: ${summary.go}`,
    `❌ Không tham gia: ${summary.nogo}`,
    '```',
  ].join('\n');
}

function renderGoList(votes: RenderVote[], options: AttendanceRenderOptions) {
  const goVotes = votes
    .filter(vote => vote.choice === 'GO')
    .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());

  if (!goVotes.length) return '```txt\nChưa có ai đăng ký.\n```';

  const groups = new Map<string, RenderVote[]>();
  goVotes.forEach(vote => {
    const classType = getVoteClass(vote, options);
    groups.set(classType, [...(groups.get(classType) ?? []), vote]);
  });

  const lines = ['```txt'];
  const sortedClasses = sortClasses(Array.from(groups.keys()));

  sortedClasses.forEach((classType, classIndex) => {
    const classVotes = groups.get(classType) ?? [];
    lines.push(`${classType} (${classVotes.length})`);
    classVotes.forEach((vote, index) => {
      lines.push(`${index + 1}. ${getVoteName(vote, options)}`);
    });
    if (classIndex !== sortedClasses.length - 1) lines.push('');
  });

  lines.push('```');
  return lines.join('\n');
}

function renderChoiceList(votes: RenderVote[], choice: AttendanceChoice, emptyText: string, options: AttendanceRenderOptions) {
  const choiceVotes = votes
    .filter(vote => vote.choice === choice)
    .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());

  if (!choiceVotes.length) return `\`\`\`txt\n${emptyText}\n\`\`\``;

  return [
    '```txt',
    ...choiceVotes.map((vote, index) => `${index + 1}. ${getVoteName(vote, options)} - ${getVoteClass(vote, options)}`),
    '```',
  ].join('\n');
}

export function renderAttendancePublicContent(session: RenderSession, votes: RenderVote[], options: AttendanceRenderOptions = {}) {
  const header = session.headerText?.trim() || (session.type === 'SCRIM' ? 'Điểm danh Scrim' : 'Điểm danh Bang Chiến');
  const statusLine = session.status === 'OPEN' ? '🟢 **Đang mở điểm danh**' : '🔒 **Đã đóng điểm danh**';
  const lastUpdate = session.lastRenderedAt ?? session.lastVoteAt ?? session.updatedAt;

  return [
    `## ${header}`,
    statusLine,
    '',
    renderSummary(votes),
    '**Danh sách tham gia:**',
    renderGoList(votes, options),
    '**Danh sách không tham gia:**',
    renderChoiceList(votes, 'NOGO', "Chưa có ai chọn 'Không tham gia'.", options),
    `**Cập nhật lần cuối:** **${formatVietnameseDate(lastUpdate)}**`,
  ].join('\n');
}
