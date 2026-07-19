type MemberRow = {
  id: string;
  ingameName: string | null;
  displayName: string;
  classType: string;
  joinedAt: Date | null;
  discordUserId: string;
  username: string;
  roles: Array<{ roleName: string }>;
  avatar: string | null;
  active: boolean;
  gvgParticipationCount?: number;
};

export function serializeMember(member: MemberRow) {
  return {
    id: member.id,
    name: member.ingameName || member.displayName,
    ingameName: member.ingameName,
    discordDisplayName: member.displayName,
    classType: member.classType,
    joinedAt: member.joinedAt?.toISOString() ?? null,
    discordId: member.discordUserId,
    discordUsername: member.username,
    discordRoles: member.roles.map(role => role.roleName),
    avatar: member.avatar,
    active: member.active,
    gvgParticipationCount: member.gvgParticipationCount ?? 0,
  };
}

export function serializeMembers(members: MemberRow[]) {
  return members.map(serializeMember);
}
