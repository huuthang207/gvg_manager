import { prisma } from './db.js';
import { serializeSnapshotSquadGroups, serializeSquadGroups } from './serializers/squadSerializer.js';

export type PersistedSquadGroupInput = Array<{
  id?: string;
  name?: string;
  leaderMemberId?: string | null;
  teams?: Array<{
    id?: string;
    name?: string;
    memberIds?: string[];
    reserveMemberIds?: string[];
    memberNotes?: Record<string, string>;
  }>;
}>;

const squadLayoutSaveQueues = new Map<string, Promise<void>>();

async function runExclusiveSquadLayoutSave<T>(guildId: string, operation: () => Promise<T>): Promise<T> {
  const previous = squadLayoutSaveQueues.get(guildId) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>(resolve => {
    release = resolve;
  });
  const queued = previous.then(() => current);

  squadLayoutSaveQueues.set(guildId, queued);
  await previous;

  try {
    return await operation();
  } finally {
    release();
    if (squadLayoutSaveQueues.get(guildId) === queued) {
      squadLayoutSaveQueues.delete(guildId);
    }
  }
}

export const serializeSnapshotGroups = serializeSnapshotSquadGroups;

function removeDuplicateSnapshotMembers(groups: ReturnType<typeof serializeSnapshotGroups>): ReturnType<typeof serializeSnapshotGroups> {
  const seenMemberIds = new Set<string>();

  return groups.map(group => ({
    ...group,
    leaderMemberId: group.leaderMemberId && seenMemberIds.has(group.leaderMemberId) ? null : group.leaderMemberId,
    teams: group.teams.map(team => {
      const memberNotes = { ...(team.memberNotes ?? {}) };
      const filterMemberId = (memberId: string) => {
        if (!memberId) return '';
        if (seenMemberIds.has(memberId)) {
          delete memberNotes[memberId];
          return '';
        }
        seenMemberIds.add(memberId);
        return memberId;
      };

      const memberIds = team.memberIds.map(filterMemberId);
      const reserveMemberIds = team.reserveMemberIds.map(filterMemberId);
      const assignedMemberIds = new Set([...memberIds, ...reserveMemberIds].filter(Boolean));
      Object.keys(memberNotes).forEach(memberId => {
        if (!assignedMemberIds.has(memberId)) delete memberNotes[memberId];
      });

      return {
        ...team,
        memberIds,
        reserveMemberIds,
        memberNotes,
      };
    }),
  }));
}

function collectSnapshotMemberSkills(groups: ReturnType<typeof serializeSnapshotGroups>) {
  const skillsByMemberId = new Map<string, Set<string>>();

  groups.forEach(group => {
    group.teams.forEach(team => {
      team.memberIds.forEach((memberId, slotIndex) => {
        if (!memberId) return;
        skillsByMemberId.set(memberId, new Set(team.slotSkills?.[`main-${slotIndex}`] ?? []));
      });
      team.reserveMemberIds.forEach((memberId, slotIndex) => {
        if (!memberId) return;
        skillsByMemberId.set(memberId, new Set(team.slotSkills?.[`reserve-${slotIndex}`] ?? []));
      });
    });
  });

  return skillsByMemberId;
}

export async function persistSquadGroupsForGuild(guildId: string, groups: PersistedSquadGroupInput) {
  const memberIds = [...new Set(groups.flatMap(group => [
    ...(group.leaderMemberId ? [group.leaderMemberId] : []),
    ...(group.teams ?? []).flatMap(team => [
      ...(team.memberIds ?? []),
      ...(team.reserveMemberIds ?? []),
    ]),
  ]).filter(Boolean))];

  const validMemberIds = new Set<string>();
  if (memberIds.length > 0) {
    const validMembers = await prisma.member.findMany({
      where: { guildId, id: { in: memberIds } },
      select: { id: true },
    });
    validMembers.forEach(member => validMemberIds.add(member.id));
  }

  await runExclusiveSquadLayoutSave(guildId, async () => {
    await prisma.$transaction(async tx => {
      const existingGroups = await tx.squadGroup.findMany({
        where: { guildId },
        include: {
          teams: {
            include: { slots: { orderBy: [{ slotType: 'asc' }, { slotIndex: 'asc' }] } },
          },
        },
        orderBy: { orderIndex: 'asc' },
      });

      const requestedGroupIds = new Set(
        groups.map(group => group.id).filter((id): id is string => !!id)
      );
      const staleGroups = existingGroups.filter(group => !requestedGroupIds.has(group.id));

      for (const staleGroup of staleGroups) {
        await tx.squadGroup.deleteMany({ where: { id: staleGroup.id, guildId } });
      }

      const refreshedGroups = await tx.squadGroup.findMany({
        where: { guildId },
        include: {
          teams: {
            include: { slots: { orderBy: [{ slotType: 'asc' }, { slotIndex: 'asc' }] } },
          },
        },
        orderBy: { orderIndex: 'asc' },
      });
      const groupById = new Map(refreshedGroups.map(group => [group.id, group]));

      for (const [groupIndex, group] of groups.entries()) {
        const requestedGroupId = group.id && groupById.has(group.id) ? group.id : undefined;
        const savedGroup = requestedGroupId
          ? await tx.squadGroup.update({
              where: { id: requestedGroupId },
              data: {
                name: group.name!.trim(),
                orderIndex: groupIndex,
                leaderMemberId: group.leaderMemberId && validMemberIds.has(group.leaderMemberId) ? group.leaderMemberId : null,
              },
            })
          : await tx.squadGroup.create({
              data: {
                guildId,
                name: group.name!.trim(),
                orderIndex: groupIndex,
                leaderMemberId: group.leaderMemberId && validMemberIds.has(group.leaderMemberId) ? group.leaderMemberId : null,
              },
            });

        const existingTeams = requestedGroupId
          ? groupById.get(requestedGroupId)?.teams ?? []
          : [];
        const requestedTeamIds = new Set(
          (group.teams ?? []).map(team => team.id).filter((id): id is string => !!id)
        );

        for (const staleTeam of existingTeams) {
          if (!requestedTeamIds.has(staleTeam.id)) {
            await tx.squadTeam.deleteMany({ where: { id: staleTeam.id, groupId: savedGroup.id } });
          }
        }

        const refreshedTeams = await tx.squadTeam.findMany({
          where: { groupId: savedGroup.id },
          include: { slots: { orderBy: [{ slotType: 'asc' }, { slotIndex: 'asc' }] } },
          orderBy: { orderIndex: 'asc' },
        });
        const teamById = new Map(refreshedTeams.map(team => [team.id, team]));

        for (const [teamIndex, team] of (group.teams ?? []).entries()) {
          const requestedTeamId = team.id && teamById.has(team.id) ? team.id : undefined;
          const savedTeam = requestedTeamId
            ? await tx.squadTeam.update({
                where: { id: requestedTeamId },
                data: {
                  name: team.name!.trim(),
                  orderIndex: teamIndex,
                },
              })
            : await tx.squadTeam.create({
                data: {
                  groupId: savedGroup.id,
                  name: team.name!.trim(),
                  orderIndex: teamIndex,
                },
              });

          const mainIds = [...(team.memberIds ?? [])].slice(0, 6);
          while (mainIds.length < 6) mainIds.push('');
          const reserveIds = [...(team.reserveMemberIds ?? [])].slice(0, 3);
          while (reserveIds.length < 3) reserveIds.push('');

          const getAssignmentNote = (memberId: string | null) => {
            if (!memberId) return '';
            return (team.memberNotes?.[memberId] ?? '').trim();
          };

          const slotPayload = [
            ...mainIds.map((memberId, slotIndex) => {
              const validMemberId = memberId && validMemberIds.has(memberId) ? memberId : null;
              return {
                slotType: 'main',
                slotIndex,
                memberId: validMemberId,
                assignmentNote: getAssignmentNote(validMemberId),
              };
            }),
            ...reserveIds.map((memberId, slotIndex) => {
              const validMemberId = memberId && validMemberIds.has(memberId) ? memberId : null;
              return {
                slotType: 'reserve',
                slotIndex,
                memberId: validMemberId,
                assignmentNote: getAssignmentNote(validMemberId),
              };
            }),
          ];

          for (const slot of slotPayload) {
            await tx.squadTeamSlot.upsert({
              where: {
                teamId_slotType_slotIndex: {
                  teamId: savedTeam.id,
                  slotType: slot.slotType,
                  slotIndex: slot.slotIndex,
                },
              },
              update: {
                memberId: slot.memberId,
                assignmentNote: slot.assignmentNote,
              },
              create: {
                teamId: savedTeam.id,
                slotType: slot.slotType,
                slotIndex: slot.slotIndex,
                memberId: slot.memberId,
                assignmentNote: slot.assignmentNote,
              },
            });
          }
        }
      }
    });
  });
}

async function writeCurrentGuildLayoutToSnapshot(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  guildId: string,
  snapshotId: string,
) {
  const currentGroups = await tx.squadGroup.findMany({
    where: { guildId },
    include: {
      teams: {
        include: {
          slots: {
            include: {
              member: {
                include: {
                  memberSkills: {
                    select: { skillId: true },
                    orderBy: { skillId: 'asc' },
                  },
                },
              },
            },
          },
        },
        orderBy: { orderIndex: 'asc' },
      },
    },
    orderBy: { orderIndex: 'asc' },
  });

  await tx.lineupSnapshotGroup.deleteMany({ where: { snapshotId } });

  for (const [groupIndex, group] of currentGroups.entries()) {
    const snapshotGroup = await tx.lineupSnapshotGroup.create({
      data: {
        snapshotId,
        name: group.name,
        orderIndex: groupIndex,
        leaderMemberId: group.leaderMemberId,
      },
    });

    for (const [teamIndex, team] of group.teams.entries()) {
      const snapshotTeam = await tx.lineupSnapshotTeam.create({
        data: {
          groupId: snapshotGroup.id,
          name: team.name,
          orderIndex: teamIndex,
        },
      });

      await tx.lineupSnapshotSlot.createMany({
        data: team.slots.map(slot => ({
          teamId: snapshotTeam.id,
          slotType: slot.slotType,
          slotIndex: slot.slotIndex,
          memberId: slot.memberId,
          skillIds: slot.member?.memberSkills.map(memberSkill => memberSkill.skillId) ?? [],
          assignmentNote: slot.assignmentNote,
        })),
      });
    }
  }
}

export async function createLineupSnapshotFromCurrentGuild(guildId: string, name: string) {
  return runExclusiveSquadLayoutSave(guildId, () => prisma.$transaction(async tx => {
    const snapshot = await tx.lineupSnapshot.create({
      data: { guildId, name },
    });

    await writeCurrentGuildLayoutToSnapshot(tx, guildId, snapshot.id);

    return tx.lineupSnapshot.findUniqueOrThrow({
      where: { id: snapshot.id },
      include: {
        groups: {
          include: {
            teams: {
              include: {
                slots: { orderBy: [{ slotType: 'asc' }, { slotIndex: 'asc' }] },
              },
              orderBy: { orderIndex: 'asc' },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
  }));
}

export async function overwriteLineupSnapshotFromCurrentGuild(guildId: string, snapshotId: string, name?: string) {
  return runExclusiveSquadLayoutSave(guildId, () => prisma.$transaction(async tx => {
    const existingSnapshot = await tx.lineupSnapshot.findFirst({
      where: { id: snapshotId, guildId },
      select: { id: true },
    });

    if (!existingSnapshot) {
      throw new Error('Không tìm thấy đội hình đã lưu.');
    }

    await tx.lineupSnapshot.update({
      where: { id: snapshotId },
      data: name ? { name } : {},
    });

    await writeCurrentGuildLayoutToSnapshot(tx, guildId, snapshotId);

    return tx.lineupSnapshot.findUniqueOrThrow({
      where: { id: snapshotId },
      include: {
        groups: {
          include: {
            teams: {
              include: {
                slots: { orderBy: [{ slotType: 'asc' }, { slotIndex: 'asc' }] },
              },
              orderBy: { orderIndex: 'asc' },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
  }));
}

export async function restoreLineupSnapshotToCurrentGuild(guildId: string, snapshotId: string) {
  const snapshot = await prisma.lineupSnapshot.findFirst({
    where: { id: snapshotId, guildId },
    include: {
      groups: {
        include: {
          teams: {
            include: { slots: { orderBy: [{ slotType: 'asc' }, { slotIndex: 'asc' }] } },
            orderBy: { orderIndex: 'asc' },
          },
        },
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  if (!snapshot) {
    throw new Error('Không tìm thấy đội hình đã lưu.');
  }

  const groups = removeDuplicateSnapshotMembers(serializeSnapshotGroups(snapshot.groups));
  const skillsByMemberId = collectSnapshotMemberSkills(groups);

  await persistSquadGroupsForGuild(guildId, groups);

  const memberIds = [...skillsByMemberId.keys()];
  if (memberIds.length === 0) return;

  const skillIds = [...new Set([...skillsByMemberId.values()].flatMap(skillSet => [...skillSet]))];
  const validSkills = skillIds.length > 0
    ? await prisma.skill.findMany({ where: { guildId, id: { in: skillIds } }, select: { id: true } })
    : [];
  const validSkillIds = new Set(validSkills.map(skill => skill.id));

  await prisma.$transaction(async tx => {
    await tx.memberSkill.deleteMany({ where: { memberId: { in: memberIds } } });

    const data = memberIds.flatMap(memberId => (
      [...(skillsByMemberId.get(memberId) ?? [])]
        .filter(skillId => validSkillIds.has(skillId))
        .map(skillId => ({ memberId, skillId }))
    ));

    if (data.length > 0) {
      await tx.memberSkill.createMany({ data, skipDuplicates: true });
    }
  });
}

export async function getLineupSnapshotDetailForGuild(guildId: string, snapshotId: string) {
  const snapshot = await prisma.lineupSnapshot.findFirst({
    where: { id: snapshotId, guildId },
    include: {
      groups: {
        include: {
          teams: {
            include: { slots: { orderBy: [{ slotType: 'asc' }, { slotIndex: 'asc' }] } },
            orderBy: { orderIndex: 'asc' },
          },
        },
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  if (!snapshot) return null;

  return {
    id: snapshot.id,
    name: snapshot.name,
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
    groups: serializeSnapshotGroups(snapshot.groups),
  };
}

export async function deleteLineupSnapshotForGuild(guildId: string, snapshotId: string) {
  return prisma.lineupSnapshot.deleteMany({
    where: { id: snapshotId, guildId },
  });
}

export async function listLineupSnapshotsForGuild(guildId: string) {
  const snapshots = await prisma.lineupSnapshot.findMany({
    where: { guildId },
    include: {
      groups: {
        include: { teams: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return snapshots.map(snapshot => ({
    id: snapshot.id,
    name: snapshot.name,
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
    groupCount: snapshot.groups.length,
    teamCount: snapshot.groups.reduce((sum, group) => sum + group.teams.length, 0),
  }));
}

export async function requireCurrentGuild(userId: string) {
  return prisma.guild.findFirst({
    where: { ownerUserId: userId },
    orderBy: { updatedAt: 'desc' },
  });
}
