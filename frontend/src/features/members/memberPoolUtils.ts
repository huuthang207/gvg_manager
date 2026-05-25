import type { Member } from '../../types.ts';

type MemberLike = Omit<Member, 'classType' | 'previousClassType'> & {
  classType: string;
  previousClassType?: string | null;
};

export function normalizeMember(member: MemberLike): Member {
  return {
    ...member,
    classType: member.classType as Member['classType'],
    previousClassType: member.previousClassType as Member['classType'] | null | undefined,
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
  upsertMembers.forEach(member => {
    const previous = map.get(member.id);
    map.set(member.id, {
      ...normalizeMember(member),
      assignedSkills: member.assignedSkills ?? previous?.assignedSkills ?? [],
    });
  });
  removedMemberIds.forEach(id => {
    map.delete(id);
  });
  return sortMembersByDisplayName(Array.from(map.values()));
}

export function replaceMemberPoolPreservingSkills(prev: Member[], members: MemberLike[]) {
  const previousSkillsByMemberId = new Map(prev.map(member => [member.id, member.assignedSkills || []]));

  return members.map(member => ({
    ...normalizeMember(member),
    assignedSkills: member.assignedSkills ?? previousSkillsByMemberId.get(member.id) ?? [],
  }));
}
