import type { AttendanceChoice, AttendanceSessionStatus } from '@prisma/client';

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
  headerText: string | null;
  status: AttendanceSessionStatus;
  lastRenderedAt: Date | null;
  lastVoteAt: Date | null;
  updatedAt: Date;
};

function getVoteName(vote: RenderVote) {
  return vote.snapshotIngameName || vote.member?.ingameName || vote.member?.displayName || 'Unknown';
}

function getVoteClass(vote: RenderVote) {
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
      if (vote.choice === 'MAYBE') summary.maybe += 1;
      if (vote.choice === 'NOGO') summary.nogo += 1;
      summary.total += 1;
      return summary;
    },
    { go: 0, maybe: 0, nogo: 0, total: 0 },
  );
}

function renderSummary(votes: RenderVote[]) {
  const summary = summarizeAttendanceRenderVotes(votes);
  const classCounts = new Map<string, number>();

  votes.forEach(vote => {
    const classType = getVoteClass(vote);
    classCounts.set(classType, (classCounts.get(classType) ?? 0) + 1);
  });

  const sortedClasses = sortClasses(Array.from(classCounts.keys()));
  const classLine = sortedClasses.length
    ? `⚔️ Theo phái: ${sortedClasses.map(classType => `${classType}:${classCounts.get(classType)}`).join(' | ')}`
    : 'Theo phái: (chưa có)';

  return [
    '```txt',
    `Tổng vote: ${summary.total}`,
    `✅ Tham gia: ${summary.go}`,
    `❔ Dự bị: ${summary.maybe}`,
    `❌ Không tham gia: ${summary.nogo}`,
    classLine,
    '```',
  ].join('\n');
}

function renderGoList(votes: RenderVote[]) {
  const goVotes = votes
    .filter(vote => vote.choice === 'GO')
    .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());

  if (!goVotes.length) return '```txt\nChưa có ai đăng ký.\n```';

  const groups = new Map<string, RenderVote[]>();
  goVotes.forEach(vote => {
    const classType = getVoteClass(vote);
    groups.set(classType, [...(groups.get(classType) ?? []), vote]);
  });

  const lines = ['```txt'];
  const sortedClasses = sortClasses(Array.from(groups.keys()));

  sortedClasses.forEach((classType, classIndex) => {
    const classVotes = groups.get(classType) ?? [];
    lines.push(`${classType} (${classVotes.length})`);
    classVotes.forEach((vote, index) => {
      lines.push(`${index + 1}. ${getVoteName(vote)}`);
    });
    if (classIndex !== sortedClasses.length - 1) lines.push('');
  });

  lines.push('```');
  return lines.join('\n');
}

function renderChoiceList(votes: RenderVote[], choice: AttendanceChoice, emptyText: string) {
  const choiceVotes = votes
    .filter(vote => vote.choice === choice)
    .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());

  if (!choiceVotes.length) return `\`\`\`txt\n${emptyText}\n\`\`\``;

  return [
    '```txt',
    ...choiceVotes.map((vote, index) => `${index + 1}. ${getVoteName(vote)} - ${getVoteClass(vote)}`),
    '```',
  ].join('\n');
}

export function renderAttendancePublicContent(session: RenderSession, votes: RenderVote[]) {
  const header = session.headerText?.trim() || 'Điểm danh Bang Chiến';
  const statusLine = session.status === 'OPEN' ? '🟢 **Đang mở điểm danh**' : '🔒 **Đã đóng điểm danh**';
  const lastUpdate = session.lastRenderedAt ?? session.lastVoteAt ?? session.updatedAt;

  return [
    `## ${header}`,
    statusLine,
    '',
    renderSummary(votes),
    '**Danh sách tham gia:**',
    renderGoList(votes),
    '**Danh sách dự bị:**',
    renderChoiceList(votes, 'MAYBE', "Chưa có ai chọn 'Dự bị'."),
    '**Danh sách không tham gia:**',
    renderChoiceList(votes, 'NOGO', "Chưa có ai chọn 'Không tham gia'."),
    `**Cập nhật lần cuối:** **${formatVietnameseDate(lastUpdate)}**`,
  ].join('\n');
}
