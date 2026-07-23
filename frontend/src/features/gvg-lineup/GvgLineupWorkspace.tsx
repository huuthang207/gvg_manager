import React from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Minus, Plus, Search, Trash2, Users } from 'lucide-react';
import type { GvgLineup, GvgLineupSquad } from '../../services/apiTypes.ts';
import type { Member } from '../../shared/types/member.ts';
import {
  createGvgLineupDivision,
  createGvgLineupSquad,
  deleteGvgLineupDivision,
  deleteGvgLineupSquad,
  reorderGvgLineupSquads,
  updateGvgLineupDivisionNote,
  updateGvgLineupSquadSlots,
} from '../../services/gvgLineupApi.ts';
import { CLASSES, getClassColor, getClassIcon } from '../../constants.ts';
import { useSystemDialog } from '../app/SystemDialogProvider.tsx';
import {
  filterGvgMembersByName,
  getAvailableGvgMembers,
  getEffectiveGvgClass,
  reorderSquadsWithinDivision,
} from './gvgLineupLayout.ts';

const MAX_SQUADS = 5;
const SLOT_COUNT = 6;
const SLOT_INDEXES = Array.from({ length: SLOT_COUNT }, (_, slotIndex) => slotIndex);

const squadOrderButtonClass = 'flex h-7 w-7 items-center justify-center rounded text-slate-500 transition-colors hover:bg-sky-500/10 hover:text-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-400/70 disabled:cursor-not-allowed disabled:opacity-35';

function SquadOrderButtons({
  disableMoveLeft,
  disableMoveRight,
  moveLeftLabel,
  moveRightLabel,
  onMoveLeft,
  onMoveRight,
}: {
  disableMoveLeft: boolean;
  disableMoveRight: boolean;
  moveLeftLabel: string;
  moveRightLabel: string;
  onMoveLeft: () => void;
  onMoveRight: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5" aria-label="Di chuyển tổ đội">
      <button type="button" onClick={onMoveLeft} disabled={disableMoveLeft} className={squadOrderButtonClass} aria-label={moveLeftLabel} title={moveLeftLabel}><ChevronLeft size={16} /></button>
      <button type="button" onClick={onMoveRight} disabled={disableMoveRight} className={squadOrderButtonClass} aria-label={moveRightLabel} title={moveRightLabel}><ChevronRight size={16} /></button>
    </div>
  );
}

type Props = {
  lineup: GvgLineup | null;
  members: Member[];
  canEdit: boolean;
  onLineupChange: (lineup: GvgLineup) => void;
  onLineupMutationPendingChange: (pending: boolean) => void;
  onReload: () => Promise<unknown>;
};

type SlotClasses = Record<string, string>;

function getSlotKey(squadId: string, slotIndex: number) {
  return `${squadId}:${slotIndex}`;
}

function ClassIcon({ classType }: { classType: string | null }) {
  const icon = classType ? getClassIcon(classType) : null;
  if (icon) return <img src={icon} alt="" className="h-5 w-5 shrink-0 object-contain" />;
  return <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-dashed border-slate-600 text-slate-500"><Plus size={12} /></span>;
}

function SquadCard({
  squad,
  divisionIndex,
  squadIndex,
  squadCount,
  members,
  assignedMemberIds,
  slotClasses,
  openClassSlot,
  canEdit,
  saving,
  onClassChange,
  onOpenClassSlotChange,
  onMoveSquad,
  onUpdate,
  onDelete,
}: {
  key?: React.Key;
  squad: GvgLineupSquad;
  divisionIndex: number;
  squadIndex: number;
  squadCount: number;
  members: Member[];
  assignedMemberIds: Set<string>;
  slotClasses: SlotClasses;
  openClassSlot: string | null;
  canEdit: boolean;
  saving: boolean;
  onClassChange: (slotKey: string, classType: string | null) => void;
  onOpenClassSlotChange: (slotKey: string | null) => void;
  onMoveSquad: (sourceIndex: number, targetIndex: number) => void;
  onUpdate: (memberIds: Array<string | null>) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [openSlot, setOpenSlot] = React.useState<number | null>(null);
  const [memberQuery, setMemberQuery] = React.useState('');
  const cardRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!cardRef.current?.contains(event.target as Node)) {
        setOpenSlot(null);
        onOpenClassSlotChange(null);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [onOpenClassSlotChange]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenSlot(null);
        onOpenClassSlotChange(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onOpenClassSlotChange]);

  React.useEffect(() => { if (openSlot === null) setMemberQuery(''); }, [openSlot]);

  const chooseMember = async (slotIndex: number, memberId: string | null) => {
    if (!memberId) onClassChange(getSlotKey(squad.id, slotIndex), null);
    const next = squad.slots.map((slot, index) => index === slotIndex ? memberId : slot.memberId);
    setOpenSlot(null);
    await onUpdate(next);
  };

  return (
    <article ref={cardRef} className="min-w-0 rounded-xl border border-slate-700/80 bg-slate-900/85 shadow-xl shadow-black/15">
      <header className="flex items-center justify-between gap-2 border-b border-slate-800 px-3 py-2.5">
        <h3 className="min-w-0 flex-1 truncate text-sm font-black uppercase tracking-wider text-white" title={squad.name}>{squad.name}</h3>
        {canEdit && <SquadOrderButtons
          disableMoveLeft={saving || squadIndex === 0}
          disableMoveRight={saving || squadIndex === squadCount - 1}
          moveLeftLabel={`Đưa toàn bộ ${squad.name} sang trái trong Đoàn ${divisionIndex + 1}`}
          moveRightLabel={`Đưa toàn bộ ${squad.name} sang phải trong Đoàn ${divisionIndex + 1}`}
          onMoveLeft={() => onMoveSquad(squadIndex, squadIndex - 1)}
          onMoveRight={() => onMoveSquad(squadIndex, squadIndex + 1)}
        />}
        {canEdit && <button type="button" onClick={() => void onDelete()} disabled={saving} className="rounded p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50" title="Xóa tổ đội" aria-label="Xóa tổ đội"><Trash2 size={15} /></button>}
      </header>

      <div className="space-y-1.5 p-3">
          {SLOT_INDEXES.map(slotIndex => {
          const slot = squad.slots[slotIndex] ?? { memberId: null, member: null };
          const slotKey = getSlotKey(squad.id, slotIndex);
          const selectedClass = slotClasses[slotKey] ?? null;
          const effectiveClass = getEffectiveGvgClass(selectedClass, slot.member?.classType);
          const color = effectiveClass ? getClassColor(effectiveClass) : null;
          const availableMembers = effectiveClass
            ? filterGvgMembersByName(getAvailableGvgMembers(members, assignedMemberIds, slot.memberId, effectiveClass), memberQuery)
            : [];
          const classMenuOpen = openClassSlot === slotKey;

          return (
                <div
                  key={slotIndex}
                  className="relative flex min-h-10 items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/35 px-2"
                  style={color ? { borderColor: `${color}a8`, backgroundColor: `${color}18` } : undefined}
                >
              <div className="relative shrink-0">
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => onOpenClassSlotChange(classMenuOpen ? null : slotKey)}
                    onKeyDown={event => { if (event.key === 'Escape') onOpenClassSlotChange(null); }}
                    aria-label={effectiveClass ? `Chọn phái, đang chọn ${effectiveClass}` : 'Chọn phái'}
                    aria-expanded={classMenuOpen}
                    title={effectiveClass ? `Phái: ${effectiveClass}` : 'Chọn phái'}
                    className="flex h-8 w-8 items-center justify-center rounded-md bg-transparent transition-colors hover:bg-slate-900/40 focus:outline-none focus:ring-2 focus:ring-sky-400/70"
                  >
                    <ClassIcon classType={effectiveClass} />
                  </button>
                ) : <ClassIcon classType={slot.member?.classType ?? null} />}

                {canEdit && classMenuOpen && (
                  <div onPointerDown={event => event.stopPropagation()} className="absolute left-0 top-[calc(100%+0.25rem)] z-30 grid w-36 grid-cols-3 gap-1 rounded-xl border border-slate-700/90 bg-slate-950/98 p-1.5 shadow-2xl shadow-black/60">
                    {CLASSES.map(classType => (
                      <button
                        key={classType}
                        type="button"
                        onClick={() => {
                          onClassChange(slotKey, classType);
                          onOpenClassSlotChange(null);
                          setMemberQuery('');
                          setOpenSlot(slotIndex);
                        }}
                        aria-label={`Chọn phái ${classType}`}
                        title={classType}
                        className={`flex h-9 w-full items-center justify-center rounded-lg transition-colors ${effectiveClass === classType ? 'text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                        style={effectiveClass === classType ? { backgroundColor: `${getClassColor(classType)}55` } : undefined}
                      >
                        <ClassIcon classType={classType} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {canEdit ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!effectiveClass) {
                      setOpenSlot(null);
                      onOpenClassSlotChange(slotKey);
                      return;
                    }
                    setOpenSlot(openSlot === slotIndex ? null : slotIndex);
                  }}
                  className="flex min-w-0 flex-1 items-center gap-1 text-left text-xs text-slate-200"
                  aria-label={slot.member?.name ? `Chọn thành viên, hiện tại ${slot.member.name}` : effectiveClass ? `Chọn thành viên phái ${effectiveClass}` : 'Chọn phái'}
                  aria-expanded={openSlot === slotIndex}
                >
                  {slot.member && <span className="min-w-0 flex-1 truncate">{slot.member.name}</span>}
                  <ChevronDown size={14} className="ml-auto text-slate-500" />
                </button>
              ) : <span className="min-w-0 flex-1 truncate text-xs text-slate-300">{slot.member?.name ?? 'Vị trí trống'}</span>}
              {canEdit && slot.member && <button type="button" onClick={() => void chooseMember(slotIndex, null)} className="rounded p-1 text-slate-500 hover:bg-red-500/10 hover:text-red-300" aria-label="Gỡ thành viên"><Minus size={12} /></button>}

              {canEdit && openSlot === slotIndex && (
                <div className="absolute left-0 top-[calc(100%+0.25rem)] z-20 w-full overflow-hidden rounded-xl border border-slate-700/90 bg-slate-950/98 p-1.5 shadow-2xl shadow-black/60">
                  {effectiveClass ? (
                    <>
                      <div className="border-b border-slate-800 px-1.5 pb-2 pt-0.5">
                        <div className="relative">
                          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                          <input
                            autoFocus
                            value={memberQuery}
                            onChange={event => setMemberQuery(event.target.value)}
                            placeholder={`Tìm ${effectiveClass}...`}
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 py-1.5 pl-8 pr-2 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-400/70 focus:ring-2 focus:ring-sky-400/20"
                          />
                        </div>
                        {slot.member && slot.member.classType !== effectiveClass && <p className="mt-1.5 text-[10px] text-amber-200">Thành viên hiện tại vẫn được giữ đến khi bạn chọn người thay thế.</p>}
                      </div>
                      <div className="max-h-64 overflow-y-auto pt-1 custom-scrollbar">
                        <button type="button" onClick={() => void chooseMember(slotIndex, null)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold text-slate-400 hover:bg-slate-800"><Users size={15} />Vị trí trống</button>
                        {availableMembers.map(member => <button key={member.id} type="button" onClick={() => void chooseMember(slotIndex, member.id)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold text-slate-200 hover:bg-slate-800"><ClassIcon classType={member.classType} /><span className="min-w-0 flex-1 truncate">{member.name}</span><span className="text-[10px]" style={{ color: getClassColor(member.classType) }}>{member.classType}</span></button>)}
                        {!availableMembers.length && <p className="px-2.5 py-3 text-center text-xs text-slate-500">Không có thành viên {effectiveClass} phù hợp.</p>}
                      </div>
                    </>
                  ) : null}
                </div>
              )}
                </div>
          );
        })}
      </div>
    </article>
  );
}

export function GvgLineupWorkspace({ lineup, members, canEdit, onLineupChange, onLineupMutationPendingChange, onReload }: Props) {
  const { alert, confirm } = useSystemDialog();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [slotClasses, setSlotClasses] = React.useState<SlotClasses>({});
  const [openClassSlot, setOpenClassSlot] = React.useState<string | null>(null);
  const [noteDraft, setNoteDraft] = React.useState('');
  const [noteDraftDivisionId, setNoteDraftDivisionId] = React.useState<string | null>(null);
  const [noteDirty, setNoteDirty] = React.useState(false);

  React.useEffect(() => {
    const update = (event: Event) => onLineupChange((event as CustomEvent<GvgLineup>).detail);
    window.addEventListener('gvg-lineup-local-update', update);
    return () => window.removeEventListener('gvg-lineup-local-update', update);
  }, [onLineupChange]);

  React.useEffect(() => {
    if (!lineup) return;
    setSelectedId(current => current && lineup.divisions.some(division => division.id === current) ? current : lineup.divisions[0]?.id ?? null);

    const validSlotKeys = new Set(lineup.divisions.flatMap(division => division.squads.flatMap(squad => Array.from({ length: SLOT_COUNT }, (_, slotIndex) => getSlotKey(squad.id, slotIndex)))));
    setSlotClasses(current => {
      const next = Object.fromEntries(Object.entries(current).filter(([slotKey]) => validSlotKeys.has(slotKey)));
      return Object.keys(next).length === Object.keys(current).length ? current : next;
    });
    setOpenClassSlot(current => current && validSlotKeys.has(current) ? current : null);
  }, [lineup]);

  React.useEffect(() => {
    if (!lineup || !selectedId) return;
    const division = lineup.divisions.find(item => item.id === selectedId);
    if (!division || (noteDirty && noteDraftDivisionId === division.id)) return;
    setNoteDraft(division.note ?? '');
    setNoteDraftDivisionId(division.id);
    setNoteDirty(false);
  }, [lineup, noteDirty, noteDraftDivisionId, selectedId]);

  if (!lineup) return <div className="flex h-full items-center justify-center text-slate-400">Đang tải đội hình Bang Chiến...</div>;

  const selectedIndex = Math.max(0, lineup.divisions.findIndex(division => division.id === selectedId));
  const selectedDivision = lineup.divisions[selectedIndex] ?? null;
  const assignedMemberIds = new Set(lineup.divisions.flatMap(division => division.squads.flatMap(squad => squad.slots.flatMap(slot => slot.memberId ? [slot.memberId] : []))));

  const apply = async (action: () => Promise<GvgLineup>) => {
    onLineupMutationPendingChange(true);
    setSaving(true);
    try {
      onLineupChange(await action());
      return true;
    } catch (error) {
      await alert({ title: 'Không thể cập nhật đội hình', message: error instanceof Error ? error.message : 'Vui lòng thử lại.', variant: 'error' });
      await onReload();
      return false;
    } finally {
      setSaving(false);
      onLineupMutationPendingChange(false);
    }
  };

  const createDivision = async () => {
    await apply(async () => {
      const next = await createGvgLineupDivision();
      setSelectedId(next.divisions.at(-1)?.id ?? null);
      return next;
    });
  };

  const saveDivisionNote = async (division: NonNullable<typeof selectedDivision>) => {
    if (!noteDirty || noteDraftDivisionId !== division.id || saving) return;
    if (await apply(() => updateGvgLineupDivisionNote(division.id, noteDraft))) setNoteDirty(false);
  };

  const moveSquad = (sourceIndex: number, targetIndex: number) => {
    if (!canEdit || saving || !selectedDivision) return;
    const next = reorderSquadsWithinDivision(lineup, selectedDivision.id, sourceIndex, targetIndex);
    if (next === lineup) return;
    onLineupChange(next);
    void apply(() => reorderGvgLineupSquads(selectedDivision.id, next.divisions.find(division => division.id === selectedDivision.id)?.squads.map(squad => squad.id) ?? []));
  };

  return (
    <div className="custom-scrollbar h-full overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-[1600px] space-y-4">
        {!canEdit && <p className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">Chỉ bang chủ có quyền chỉnh sửa đội hình.</p>}

        <div className="flex flex-wrap items-end gap-1 border-b border-slate-700/80 px-1" role="tablist" aria-label="Chọn đoàn Bang Chiến">
          {lineup.divisions.map((division, index) => <button key={division.id} type="button" role="tab" aria-selected={division.id === selectedDivision?.id} onClick={() => setSelectedId(division.id)} className={`relative mb-[-1px] h-10 rounded-t-xl border px-3 text-xs font-black transition-colors ${division.id === selectedDivision?.id ? 'border-slate-600 border-b-slate-900 bg-slate-900 text-sky-100' : 'border-transparent bg-slate-950/35 text-slate-500 hover:border-slate-700 hover:bg-slate-900/55 hover:text-slate-300'}`}>Đoàn {index + 1}</button>)}
          {canEdit && <button type="button" onClick={() => void createDivision()} disabled={saving || lineup.divisions.length >= 5} className="mb-1 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-900/55 text-slate-400 hover:border-sky-400/50 hover:bg-sky-500/15 hover:text-sky-100 disabled:opacity-40" aria-label="Tạo đoàn mới" title="Tạo đoàn mới"><Plus size={16} /></button>}
        </div>

        {selectedDivision ? (
          <section className="app-surface rounded-2xl border p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-black uppercase tracking-widest text-sky-200">Đoàn {selectedIndex + 1}</h2>
                <p className="mt-1 text-xs text-slate-500">{selectedDivision.squads.length}/5 tổ đội</p>
              </div>
              <div className="flex gap-2">
                {canEdit && selectedDivision.squads.length < MAX_SQUADS && <button type="button" onClick={() => void apply(() => createGvgLineupSquad(selectedDivision.id))} disabled={saving} className="app-button-primary inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold"><Plus size={14} />Tạo tổ đội</button>}
                {canEdit && <button type="button" onClick={() => void (async () => { if (selectedDivision.squads.length && !await confirm({ title: `Xóa Đoàn ${selectedIndex + 1}?`, message: `Toàn bộ ${selectedDivision.squads.length} tổ đội cùng thành viên trong Đoàn sẽ bị xóa vĩnh viễn.`, variant: 'danger', confirmLabel: 'Xóa đoàn' })) return; await apply(() => deleteGvgLineupDivision(selectedDivision.id)); })()} disabled={saving} className="app-button-danger flex min-h-9 items-center justify-center rounded-lg px-2" aria-label="Xóa đoàn" title="Xóa đoàn"><Trash2 size={14} /></button>}
              </div>
            </div>
            {selectedDivision.squads.length ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
                {selectedDivision.squads.map((squad, squadIndex) => <SquadCard key={squad.id} squad={squad} divisionIndex={selectedIndex} squadIndex={squadIndex} squadCount={selectedDivision.squads.length} members={members} assignedMemberIds={assignedMemberIds} slotClasses={slotClasses} openClassSlot={openClassSlot} canEdit={canEdit} saving={saving} onClassChange={(slotKey, classType) => setSlotClasses(current => {
                  if (classType) return { ...current, [slotKey]: classType };
                  const { [slotKey]: _removedClass, ...next } = current;
                  return next;
                })} onOpenClassSlotChange={setOpenClassSlot} onMoveSquad={moveSquad} onUpdate={async memberIds => { await apply(() => updateGvgLineupSquadSlots(squad.id, memberIds)); }} onDelete={async () => { if (!await confirm({ title: `Xóa ${squad.name}?`, message: 'Tổ đội cùng toàn bộ vị trí và thành viên trong Đoàn sẽ bị xóa vĩnh viễn.', variant: 'danger', confirmLabel: 'Xóa tổ đội' })) return; await apply(() => deleteGvgLineupSquad(squad.id)); }} />)}
              </div>
            ) : <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/25 px-5 py-10 text-center text-sm text-slate-500">Đoàn này chưa có tổ đội. {canEdit && 'Dùng nút “Tạo tổ đội” để bắt đầu.'}</div>}
            <section className="mt-4 rounded-xl border border-slate-800/80 bg-slate-950/35 p-3">
              <h3 className="text-sm font-black text-slate-100">Ghi chú đoàn</h3>
              {canEdit ? (
                <textarea
                  value={noteDraftDivisionId === selectedDivision.id ? noteDraft : selectedDivision.note ?? ''}
                  onChange={event => {
                    setNoteDraft(event.target.value);
                    setNoteDraftDivisionId(selectedDivision.id);
                    setNoteDirty(true);
                  }}
                  onBlur={() => void saveDivisionNote(selectedDivision)}
                  placeholder="Viết ghi chú cho đoàn..."
                  rows={6}
                  maxLength={2000}
                  disabled={saving}
                  className="mt-2 w-full resize-none rounded-lg border border-slate-700 bg-slate-950/60 px-2.5 py-1.5 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-sky-400/70 disabled:opacity-60"
                />
              ) : <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-300">{selectedDivision.note || 'Không có ghi chú.'}</p>}
            </section>
          </section>
        ) : (
          <section className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/25 px-6 py-12 text-center">
            <h2 className="text-lg font-black text-slate-100">Chưa có Đoàn Bang Chiến</h2>
            <p className="mt-2 text-sm text-slate-500">Tạo Đoàn đầu tiên để bắt đầu xếp đội hình.</p>
            {canEdit && <button type="button" onClick={() => void createDivision()} disabled={saving} className="app-button-primary mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-black"><Plus size={16} />Tạo Đoàn mới</button>}
          </section>
        )}
      </div>
    </div>
  );
}
