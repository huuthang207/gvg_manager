import { prisma } from '../db.js';

export const GVG_SQUAD_COUNT = 10;
export const GVG_SQUAD_CAPACITY = 6;
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
  name: string;
  orderIndex: number;
  slots: SlotRecord[];
};

type DivisionRecord = {
  id: string;
  orderIndex: number;
  note: string | null;
  squads: SquadRecord[];
};

export type GvgLineupSlot = {
  memberId: string | null;
  member: { id: string; name: string; classType: string } | null;
};

export type GvgLineupSquad = {
  id: string;
  squadNumber: number;
  name: string;
  orderIndex: number;
  slots: GvgLineupSlot[];
};

export type GvgLineupDivision = {
  id: string;
  orderIndex: number;
  note: string | null;
  squads: GvgLineupSquad[];
};

export type GvgLineup = { divisions: GvgLineupDivision[] };

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
    return { memberId: member?.id ?? null, member: member ? { id: member.id, name: member.ingameName || member.displayName, classType: member.classType } : null };
  });
}

export function serializeGvgLineup(divisions: DivisionRecord[]): GvgLineup {
  return {
    divisions: [...divisions].sort((a, b) => a.orderIndex - b.orderIndex).map(division => ({
      id: division.id,
      orderIndex: division.orderIndex,
      note: division.note,
      squads: [...division.squads].sort((a, b) => a.orderIndex - b.orderIndex).map(squad => ({
        id: squad.id,
        squadNumber: squad.squadNumber,
        name: squad.name,
        orderIndex: squad.orderIndex,
        slots: serializeSlots(squad.slots),
      })),
    })),
  };
}

async function readGvgLineup(guildId: string) {
  return prisma.gvgLineupDivision.findMany({ where: { guildId }, orderBy: { orderIndex: 'asc' }, include: lineupInclude }) as unknown as Promise<DivisionRecord[]>;
}

export async function getGvgLineup(guildId: string): Promise<GvgLineup> {
  return serializeGvgLineup(await readGvgLineup(guildId));
}

// Kept for compatibility with older app-state callers. Reads never create lineup rows.
export const ensureGvgLineup = getGvgLineup;

function error(status: 400 | 404 | 409, message: string) {
  return { status, body: { error: message } } as const;
}

const badRequest = (message: string) => error(400, message);
const notFound = (message: string) => error(404, message);
const conflict = (message: string) => error(409, message);

async function successfulLineup(guildId: string, status: 200 | 201 = 200) {
  return { status, body: await getGvgLineup(guildId) } as const;
}

async function reindexDivisions(tx: any, guildId: string, divisionIds: string[]) {
  await tx.gvgLineupDivision.updateMany({ where: { guildId }, data: { orderIndex: { increment: 1000 } } });
  await Promise.all(divisionIds.map((id, orderIndex) => tx.gvgLineupDivision.update({ where: { id }, data: { orderIndex } })));
}

async function reindexSquads(tx: any, divisionId: string, squadIds: string[]) {
  await tx.gvgLineupSquad.updateMany({ where: { divisionId }, data: { orderIndex: { increment: 1000 } } });
  await Promise.all(squadIds.map((id, orderIndex) => tx.gvgLineupSquad.update({ where: { id }, data: { orderIndex } })));
}

export async function resetGvgLineupNextSquadNumberIfEmpty(tx: any, guildId: string) {
  const squadCount = await tx.gvgLineupSquad.count({ where: { guildId } });
  if (squadCount > 0) return false;
  await tx.guild.update({ where: { id: guildId }, data: { gvgLineupNextSquadNumber: 1 } });
  return true;
}

export async function createGvgLineupDivision(guildId: string) {
  const count = await prisma.gvgLineupDivision.count({ where: { guildId } });
  if (count >= GVG_DIVISION_MAX) return conflict('Bang Chiến chỉ có tối đa 5 đoàn.');
  await prisma.gvgLineupDivision.create({ data: { guildId, orderIndex: count } });
  return successfulLineup(guildId, 201);
}

export async function deleteGvgLineupDivisionResource(guildId: string, divisionId: string) {
  const division = await prisma.gvgLineupDivision.findFirst({ where: { id: divisionId, guildId }, select: { id: true } });
  if (!division) return notFound('Không tìm thấy đoàn.');
  await prisma.$transaction(async tx => {
    const remaining = await tx.gvgLineupDivision.findMany({ where: { guildId, id: { not: divisionId } }, orderBy: { orderIndex: 'asc' }, select: { id: true } });
    await tx.gvgLineupDivision.delete({ where: { id: divisionId } });
    await reindexDivisions(tx, guildId, remaining.map((item: { id: string }) => item.id));
    await resetGvgLineupNextSquadNumberIfEmpty(tx, guildId);
  });
  return successfulLineup(guildId);
}

function validateGvgLineupDivisionNote(rawNote: unknown) {
  if (rawNote !== null && typeof rawNote !== 'string') return badRequest('Ghi chú đoàn không hợp lệ.');
  const note = typeof rawNote === 'string' ? rawNote.trim() : null;
  if (note && note.length > 2000) return badRequest('Ghi chú đoàn không được vượt quá 2000 ký tự.');
  return { status: 200 as const, body: { note: note || null } };
}

export async function updateGvgLineupDivisionNote(guildId: string, divisionId: string, rawNote: unknown) {
  const validation = validateGvgLineupDivisionNote(rawNote);
  if (validation.status !== 200) return validation;
  const division = await prisma.gvgLineupDivision.findFirst({ where: { id: divisionId, guildId }, select: { id: true } });
  if (!division) return notFound('Không tìm thấy đoàn.');
  await prisma.gvgLineupDivision.update({ where: { id: division.id }, data: { note: validation.body.note } });
  return successfulLineup(guildId);
}

export async function reorderGvgLineupDivisions(guildId: string, divisionIds: unknown) {
  if (!Array.isArray(divisionIds) || divisionIds.some(id => typeof id !== 'string')) return badRequest('Thứ tự đoàn không hợp lệ.');
  const current = await prisma.gvgLineupDivision.findMany({ where: { guildId }, select: { id: true } });
  if (divisionIds.length !== current.length || new Set(divisionIds).size !== current.length || current.some(division => !divisionIds.includes(division.id))) return badRequest('Thứ tự đoàn không khớp dữ liệu hiện có.');
  await prisma.$transaction(tx => reindexDivisions(tx, guildId, divisionIds));
  return successfulLineup(guildId);
}

export async function createGvgLineupSquad(guildId: string, divisionId: string) {
  const division = await prisma.gvgLineupDivision.findFirst({ where: { id: divisionId, guildId }, select: { id: true } });
  if (!division) return notFound('Không tìm thấy đoàn.');
  const squadCount = await prisma.gvgLineupSquad.count({ where: { divisionId } });
  if (squadCount >= GVG_SQUADS_PER_DIVISION) return conflict('Đoàn đã có tối đa 5 tổ đội.');
  await prisma.$transaction(async tx => {
    const guild = await tx.guild.update({ where: { id: guildId }, data: { gvgLineupNextSquadNumber: { increment: 1 } }, select: { gvgLineupNextSquadNumber: true } });
    const squadNumber = guild.gvgLineupNextSquadNumber - 1;
    const squad = await tx.gvgLineupSquad.create({ data: { guildId, divisionId, squadNumber, name: `Tổ đội ${squadNumber}`, orderIndex: squadCount } });
    await tx.gvgLineupSlot.createMany({ data: emptySlots().map(slot => ({ ...slot, squadId: squad.id })) });
  });
  return successfulLineup(guildId, 201);
}

export async function deleteGvgLineupSquad(guildId: string, squadId: string) {
  const squad = await prisma.gvgLineupSquad.findFirst({ where: { id: squadId, guildId }, select: { id: true, divisionId: true } });
  if (!squad) return notFound('Không tìm thấy tổ đội.');
  await prisma.$transaction(async tx => {
    const remaining = await tx.gvgLineupSquad.findMany({ where: { divisionId: squad.divisionId, id: { not: squad.id } }, orderBy: { orderIndex: 'asc' }, select: { id: true } });
    await tx.gvgLineupSquad.delete({ where: { id: squad.id } });
    await reindexSquads(tx, squad.divisionId, remaining.map((item: { id: string }) => item.id));
    await resetGvgLineupNextSquadNumberIfEmpty(tx, guildId);
  });
  return successfulLineup(guildId);
}

export async function moveGvgLineupSquad(guildId: string, squadId: string, destinationDivisionId: unknown) {
  if (typeof destinationDivisionId !== 'string') return badRequest('Đoàn đích không hợp lệ.');
  const squad = await prisma.gvgLineupSquad.findFirst({ where: { id: squadId, guildId }, select: { id: true, divisionId: true } });
  const destination = await prisma.gvgLineupDivision.findFirst({ where: { id: destinationDivisionId, guildId }, select: { id: true } });
  if (!squad || !destination) return notFound('Không tìm thấy tổ đội hoặc đoàn đích.');
  if (squad.divisionId === destinationDivisionId) return successfulLineup(guildId);
  const destinationCount = await prisma.gvgLineupSquad.count({ where: { divisionId: destinationDivisionId } });
  if (destinationCount >= GVG_SQUADS_PER_DIVISION) return conflict('Đoàn đích đã có tối đa 5 tổ đội.');
  await prisma.$transaction(async tx => {
    const sourceRemaining = await tx.gvgLineupSquad.findMany({ where: { divisionId: squad.divisionId, id: { not: squad.id } }, orderBy: { orderIndex: 'asc' }, select: { id: true } });
    const destinationSquads = await tx.gvgLineupSquad.findMany({ where: { divisionId: destinationDivisionId }, orderBy: { orderIndex: 'asc' }, select: { id: true } });
    await tx.gvgLineupSquad.update({ where: { id: squad.id }, data: { divisionId: destinationDivisionId, orderIndex: 1000 } });
    await reindexSquads(tx, squad.divisionId, sourceRemaining.map((item: { id: string }) => item.id));
    await reindexSquads(tx, destinationDivisionId, [...destinationSquads.map((item: { id: string }) => item.id), squad.id]);
  });
  return successfulLineup(guildId);
}

export async function reorderGvgLineupSquads(guildId: string, divisionId: string, squadIds: unknown) {
  if (!Array.isArray(squadIds) || squadIds.some(id => typeof id !== 'string')) return badRequest('Thứ tự tổ đội không hợp lệ.');
  const division = await prisma.gvgLineupDivision.findFirst({ where: { id: divisionId, guildId }, select: { id: true } });
  if (!division) return notFound('Không tìm thấy đoàn.');
  const current = await prisma.gvgLineupSquad.findMany({ where: { divisionId }, select: { id: true } });
  if (squadIds.length !== current.length || new Set(squadIds).size !== current.length || current.some(squad => !squadIds.includes(squad.id))) return badRequest('Thứ tự tổ đội không khớp dữ liệu hiện có.');
  await prisma.$transaction(tx => reindexSquads(tx, divisionId, squadIds));
  return successfulLineup(guildId);
}

export async function updateGvgLineupSquadSlots(guildId: string, squadId: string, memberIds: unknown) {
  if (!Array.isArray(memberIds) || memberIds.length !== GVG_SQUAD_CAPACITY || memberIds.some(memberId => memberId !== null && typeof memberId !== 'string')) return badRequest('Mỗi tổ đội phải có đúng 6 vị trí thành viên.');
  const squad = await prisma.gvgLineupSquad.findFirst({ where: { id: squadId, guildId }, include: { slots: { select: { id: true, slotIndex: true } } } });
  if (!squad) return notFound('Không tìm thấy tổ đội.');
  const ids = memberIds.filter((memberId): memberId is string => typeof memberId === 'string');
  if (new Set(ids).size !== ids.length) return badRequest('Một thành viên chỉ được thuộc một tổ đội.');
  if (ids.length) {
    const activeMembers = await prisma.member.findMany({ where: { guildId, active: true, id: { in: ids } }, select: { id: true } });
    if (activeMembers.length !== ids.length) return badRequest('Danh sách thành viên có người không hợp lệ hoặc không còn hoạt động.');
    const assigned = await prisma.gvgLineupSlot.findMany({ where: { memberId: { in: ids }, squadId: { not: squad.id } }, select: { memberId: true } });
    if (assigned.length) return badRequest('Một thành viên chỉ được thuộc một tổ đội.');
  }
  await Promise.all(memberIds.map((memberId, slotIndex) => {
    const slot = squad.slots.find(item => item.slotIndex === slotIndex);
    return slot ? prisma.gvgLineupSlot.update({ where: { id: slot.id }, data: { memberId } }) : prisma.gvgLineupSlot.create({ data: { squadId: squad.id, slotIndex, memberId } });
  }));
  return successfulLineup(guildId);
}

export async function clearGvgLineupSquadById(guildId: string, squadId: string) {
  const squad = await prisma.gvgLineupSquad.findFirst({ where: { id: squadId, guildId }, select: { id: true } });
  if (!squad) return notFound('Không tìm thấy tổ đội.');
  await prisma.gvgLineupSlot.updateMany({ where: { squadId: squad.id }, data: { memberId: null } });
  return successfulLineup(guildId);
}

function validateSquadName(rawName: unknown) {
  if (typeof rawName !== 'string') return badRequest('Tên tổ đội không hợp lệ.');
  const name = rawName.trim();
  if (!name || name.length > 32 || /[ -]/.test(name)) return badRequest('Tên tổ đội phải dài từ 1 đến 32 ký tự và không chứa ký tự xuống dòng.');
  return { status: 200 as const, body: { name } };
}

export async function updateGvgLineupSquadName(guildId: string, squadNumber: number, rawName: unknown) {
  if (!Number.isInteger(squadNumber) || squadNumber < 1) return badRequest('Tổ đội không hợp lệ.');
  const validation = validateSquadName(rawName);
  if (validation.status !== 200) return validation;
  const squad = await prisma.gvgLineupSquad.findUnique({ where: { guildId_squadNumber: { guildId, squadNumber } }, select: { id: true } });
  if (!squad) return notFound('Không tìm thấy tổ đội.');
  await prisma.gvgLineupSquad.update({ where: { id: squad.id }, data: { name: validation.body.name } });
  return successfulLineup(guildId);
}
