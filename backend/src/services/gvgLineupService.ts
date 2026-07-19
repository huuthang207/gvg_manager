import { prisma } from '../db.js';

export const GVG_SQUAD_COUNT = 10;
export const GVG_SQUAD_CAPACITY = 6;
export const GVG_DIVISION_MIN = 2;
export const GVG_DIVISION_MAX = 5;
export const GVG_SQUADS_PER_DIVISION = 5;

type SlotRecord = {
  slotIndex: number;
  memberId: string | null;
  member: { id: string; ingameName: string | null; displayName: string; classType: string; active: boolean } | null;
};

type SquadRecord = {
  id: string;
  guildId: string;
  squadNumber: number;
  orderIndex: number;
  slots: SlotRecord[];
};

type DivisionRecord = {
  id: string;
  orderIndex: number;
  squads: SquadRecord[];
};

export type GvgLineupSlot = {
  memberId: string | null;
  member: { id: string; name: string; classType: string } | null;
};

export type GvgLineupSquad = {
  id: string;
  squadNumber: number;
  orderIndex: number;
  slots: GvgLineupSlot[];
};

export type GvgLineupDivision = {
  id: string;
  orderIndex: number;
  squads: GvgLineupSquad[];
};

export type GvgLineup = { divisions: GvgLineupDivision[] };

export type GvgLineupInput = {
  divisions: Array<{
    id?: string;
    squads: Array<{
      squadNumber: number;
      memberIds: Array<string | null>;
    }>;
  }>;
};

const lineupInclude = {
  squads: {
    orderBy: [{ orderIndex: 'asc' as const }, { squadNumber: 'asc' as const }],
    include: {
      slots: {
        orderBy: { slotIndex: 'asc' as const },
        include: { member: { select: { id: true, ingameName: true, displayName: true, classType: true, active: true } } },
      },
    },
  },
};

function emptySlots() {
  return Array.from({ length: GVG_SQUAD_CAPACITY }, (_, slotIndex) => ({ slotIndex, memberId: null }));
}

function serializeSlots(slots: SlotRecord[]): GvgLineupSlot[] {
  const byIndex = new Map(slots.map(slot => [slot.slotIndex, slot]));
  return Array.from({ length: GVG_SQUAD_CAPACITY }, (_, slotIndex) => {
    const slot = byIndex.get(slotIndex);
    const member = slot?.member?.active ? slot.member : null;
    return {
      memberId: member?.id ?? null,
      member: member ? { id: member.id, name: member.ingameName || member.displayName, classType: member.classType } : null,
    };
  });
}

export function serializeGvgLineup(divisions: DivisionRecord[]): GvgLineup {
  return {
    divisions: divisions
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map(division => ({
        id: division.id,
        orderIndex: division.orderIndex,
        squads: division.squads
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map(squad => ({
            id: squad.id,
            squadNumber: squad.squadNumber,
            orderIndex: squad.orderIndex,
            slots: serializeSlots(squad.slots),
          })),
      })),
  };
}

async function readGvgLineup(guildId: string) {
  return prisma.gvgLineupDivision.findMany({
    where: { guildId },
    orderBy: { orderIndex: 'asc' },
    include: lineupInclude,
  }) as unknown as Promise<DivisionRecord[]>;
}

export async function ensureGvgLineup(guildId: string): Promise<GvgLineup> {
  const existing = await readGvgLineup(guildId);
  if (existing.length > 0) return serializeGvgLineup(existing);

  await prisma.$transaction(async tx => {
    const alreadyCreated = await tx.gvgLineupDivision.count({ where: { guildId } });
    if (alreadyCreated > 0) return;

    const divisions = await Promise.all([0, 1].map(orderIndex => tx.gvgLineupDivision.create({
      data: { guildId, orderIndex },
    })));

    for (let squadNumber = 1; squadNumber <= GVG_SQUAD_COUNT; squadNumber += 1) {
      const divisionIndex = squadNumber <= 5 ? 0 : 1;
      const squad = await tx.gvgLineupSquad.create({
        data: {
          guildId,
          divisionId: divisions[divisionIndex].id,
          squadNumber,
          orderIndex: (squadNumber - 1) % 5,
        },
      });
      await tx.gvgLineupSlot.createMany({
        data: emptySlots().map(slot => ({ ...slot, squadId: squad.id })),
      });
    }
  });

  return serializeGvgLineup(await readGvgLineup(guildId));
}

function validationError(error: string) {
  return { status: 400 as const, body: { error } };
}

export async function validateGvgLineupInput(guildId: string, input: unknown) {
  const divisions = (input as GvgLineupInput | null)?.divisions;
  if (!Array.isArray(divisions) || divisions.length < GVG_DIVISION_MIN || divisions.length > GVG_DIVISION_MAX) {
    return validationError('Đội hình phải có từ 2 đến 5 đoàn.');
  }

  const seenSquads = new Set<number>();
  const memberIds = new Set<string>();
  const divisionIds = new Set<string>();

  for (const division of divisions) {
    if (!division || !Array.isArray(division.squads) || division.squads.length === 0 || division.squads.length > GVG_SQUADS_PER_DIVISION) {
      return validationError('Mỗi đoàn phải có từ 1 đến 5 tổ đội.');
    }
    if (division.id) {
      if (divisionIds.has(division.id)) return validationError('Dữ liệu đoàn bị trùng.');
      divisionIds.add(division.id);
    }
    for (const squad of division.squads) {
      if (!Number.isInteger(squad?.squadNumber) || squad.squadNumber < 1 || squad.squadNumber > GVG_SQUAD_COUNT || seenSquads.has(squad.squadNumber)) {
        return validationError('Mỗi tổ đội từ 1 đến 10 phải xuất hiện đúng một lần.');
      }
      seenSquads.add(squad.squadNumber);
      if (!Array.isArray(squad.memberIds) || squad.memberIds.length !== GVG_SQUAD_CAPACITY || squad.memberIds.some(memberId => memberId !== null && typeof memberId !== 'string')) {
        return validationError('Mỗi tổ đội phải có đúng 6 vị trí thành viên.');
      }
      for (const memberId of squad.memberIds) {
        if (!memberId) continue;
        if (memberIds.has(memberId)) return validationError('Một thành viên chỉ được thuộc một tổ đội.');
        memberIds.add(memberId);
      }
    }
  }

  if (seenSquads.size !== GVG_SQUAD_COUNT) return validationError('Đội hình phải có đủ 10 tổ đội.');

  if (memberIds.size > 0) {
    const activeMembers = await prisma.member.findMany({
      where: { guildId, active: true, id: { in: [...memberIds] } },
      select: { id: true },
    });
    if (activeMembers.length !== memberIds.size) return validationError('Danh sách thành viên có người không hợp lệ hoặc không còn hoạt động.');
  }

  return { status: 200 as const, body: { input: input as GvgLineupInput } };
}

export async function saveGvgLineup(guildId: string, input: unknown) {
  await ensureGvgLineup(guildId);
  const validation = await validateGvgLineupInput(guildId, input);
  if (validation.status !== 200) return validation;

  const current = await prisma.gvgLineupSquad.findMany({
    where: { guildId },
    include: { slots: { select: { id: true, slotIndex: true } } },
  });
  if (current.length !== GVG_SQUAD_COUNT) return validationError('Không thể khởi tạo đủ 10 tổ đội.');
  const squadByNumber = new Map(current.map(squad => [squad.squadNumber, squad]));

  await prisma.$transaction(async tx => {
    const oldDivisions = await tx.gvgLineupDivision.findMany({ where: { guildId }, select: { id: true, orderIndex: true } });
    const temporaryOffset = 100;
    await Promise.all(oldDivisions.map(division => tx.gvgLineupDivision.update({
      where: { id: division.id },
      data: { orderIndex: temporaryOffset + division.orderIndex },
    })));
    await Promise.all(current.map(squad => tx.gvgLineupSquad.update({
      where: { id: squad.id },
      data: { orderIndex: temporaryOffset + squad.squadNumber },
    })));

    const divisionRecords = [] as Array<{ id: string }>;
    for (let divisionIndex = 0; divisionIndex < validation.body.input.divisions.length; divisionIndex += 1) {
      const submitted = validation.body.input.divisions[divisionIndex];
      const existingId = submitted.id && oldDivisions.some(division => division.id === submitted.id) ? submitted.id : null;
      divisionRecords.push(existingId
        ? await tx.gvgLineupDivision.update({ where: { id: existingId }, data: { orderIndex: divisionIndex } })
        : await tx.gvgLineupDivision.create({ data: { guildId, orderIndex: divisionIndex } }));
    }

    for (let divisionIndex = 0; divisionIndex < validation.body.input.divisions.length; divisionIndex += 1) {
      const submittedDivision = validation.body.input.divisions[divisionIndex];
      for (let squadIndex = 0; squadIndex < submittedDivision.squads.length; squadIndex += 1) {
        const submittedSquad = submittedDivision.squads[squadIndex];
        const squad = squadByNumber.get(submittedSquad.squadNumber);
        if (!squad) throw new Error('Missing fixed squad');
        await tx.gvgLineupSquad.update({
          where: { id: squad.id },
          data: { divisionId: divisionRecords[divisionIndex].id, orderIndex: squadIndex },
        });
        await Promise.all(submittedSquad.memberIds.map((memberId, slotIndex) => {
          const existingSlot = squad.slots.find(slot => slot.slotIndex === slotIndex);
          return existingSlot
            ? tx.gvgLineupSlot.update({ where: { id: existingSlot.id }, data: { memberId } })
            : tx.gvgLineupSlot.create({ data: { squadId: squad.id, slotIndex, memberId } });
        }));
      }
    }

    const retainedDivisionIds = new Set(divisionRecords.map(division => division.id));
    const removedDivisionIds = oldDivisions.map(division => division.id).filter(id => !retainedDivisionIds.has(id));
    if (removedDivisionIds.length > 0) {
      await tx.gvgLineupDivision.deleteMany({ where: { id: { in: removedDivisionIds } } });
    }
  });

  return { status: 200 as const, body: await ensureGvgLineup(guildId) };
}

export async function clearGvgLineupSquad(guildId: string, squadNumber: number) {
  if (!Number.isInteger(squadNumber) || squadNumber < 1 || squadNumber > GVG_SQUAD_COUNT) return validationError('Tổ đội không hợp lệ.');
  await ensureGvgLineup(guildId);
  const squad = await prisma.gvgLineupSquad.findUnique({
    where: { guildId_squadNumber: { guildId, squadNumber } },
    include: { slots: { select: { id: true } } },
  });
  if (!squad) return { status: 404 as const, body: { error: 'Không tìm thấy tổ đội.' } };

  await prisma.gvgLineupSlot.updateMany({ where: { squadId: squad.id }, data: { memberId: null } });
  return { status: 200 as const, body: await ensureGvgLineup(guildId) };
}
