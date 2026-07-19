import type { Member } from '../../types.ts';

type MemberLike = Omit<Member, 'classType'> & {
  classType: string;
};

export function normalizeMember(member: MemberLike): Member {
  return {
    ...member,
    classType: member.classType as Member['classType'],
  };
}

export function sortMembersByDisplayName(members: Member[]) {
  return [...members].sort((a, b) => {
    const aLabel = a.name || a.discordDisplayName || a.discordUsername || '';
    const bLabel = b.name || b.discordDisplayName || b.discordUsername || '';
    return aLabel.localeCompare(bLabel);
  });
}

export function mergeMemberDeltaIntoPool(prev: Member[], upsertMembers: MemberLike[], removedMemberIds: string[]) {
  const map = new Map<string, Member>(prev.map(member => [member.id, member]));
  upsertMembers.forEach(member => map.set(member.id, normalizeMember(member)));
  removedMemberIds.forEach(id => map.delete(id));
  return sortMembersByDisplayName(Array.from(map.values()));
}

export function replaceMemberPool(prev: Member[], members: MemberLike[]) {
  void prev;
  return members.map(normalizeMember);
}
