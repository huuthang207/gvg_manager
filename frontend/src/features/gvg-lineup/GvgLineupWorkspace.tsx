import React from 'react';
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { GripVertical, Plus, Trash2, UserMinus } from 'lucide-react';
import type { GvgLineup, GvgLineupDivision, GvgLineupSquad } from '../../services/apiTypes.ts';
import type { Member } from '../../shared/types/member.ts';
import { clearGvgLineupSquad, saveGvgLineup } from '../../services/gvgLineupApi.ts';
import { getClassColor, getClassIcon } from '../../constants.ts';
import { useSystemDialog } from '../app/SystemDialogProvider.tsx';
import { clearSquadLocal, moveSquad, moveSquadToNewDivision, setSquadMember, SQUADS_PER_DIVISION, toSavePayload } from './gvgLineupLayout.ts';

interface Props {
  lineup: GvgLineup | null;
  members: Member[];
  canEdit: boolean;
  onLineupChange: (lineup: GvgLineup) => void;
  onReload: () => Promise<unknown>;
}

function SquadCard({ squad, divisionIndex, squadIndex, members, canEdit, onClear, onMemberChange }: {
  key?: React.Key;
  squad: GvgLineupSquad;
  divisionIndex: number;
  squadIndex: number;
  members: Member[];
  canEdit: boolean;
  onClear: () => void | Promise<void>;
  onMemberChange: (slotIndex: number, memberId: string) => void | Promise<void>;
}) {
  const draggable = useDraggable({ id: `squad-${squad.squadNumber}`, data: { squadNumber: squad.squadNumber, divisionIndex, squadIndex } });
  const dropTarget = useDroppable({ id: `squad-drop-${squad.squadNumber}`, data: { divisionIndex, squadIndex } });
  const { attributes, listeners, setNodeRef, transform, isDragging } = draggable;
  const setCardRef = React.useCallback((node: HTMLElement | null) => {
    setNodeRef(node);
    dropTarget.setNodeRef(node);
  }, [dropTarget, setNodeRef]);
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  const assignedMemberIds = new Set(squad.slots.map(slot => slot.memberId).filter(Boolean));

  return (
    <article ref={setCardRef} style={style} className={`w-72 shrink-0 rounded-xl border bg-slate-900/85 shadow-xl shadow-black/15 ${dropTarget.isOver ? 'border-sky-400 ring-2 ring-sky-400/20' : 'border-slate-700/80'} ${isDragging ? 'opacity-35' : ''}`}>
      <header className="flex items-center justify-between border-b border-slate-800 px-3 py-2.5">
        <div className="flex items-center gap-2">
          {canEdit && <button type="button" {...attributes} {...listeners} className="cursor-grab rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-200" aria-label={`Kéo Tổ đội ${squad.squadNumber}`}><GripVertical size={16} /></button>}
          <h3 className="text-sm font-black uppercase tracking-wider text-white">Tổ đội {squad.squadNumber}</h3>
        </div>
        {canEdit && <button type="button" onClick={onClear} className="rounded p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-300" title="Làm trống tổ đội"><Trash2 size={15} /></button>}
      </header>
      <div className="space-y-1.5 p-3">
        {squad.slots.map((slot, slotIndex) => {
          const icon = slot.member ? getClassIcon(slot.member.classType) : null;
          const availableMembers = members.filter(member => member.id === slot.memberId || !assignedMemberIds.has(member.id));
          return (
            <div key={slotIndex} className="flex min-h-9 items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/45 px-2">
              {slot.member ? icon ? <img src={icon} className="h-5 w-5 object-contain" alt="" /> : <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getClassColor(slot.member.classType) }} /> : <span className="h-5 w-5 rounded border border-dashed border-slate-700" />}
              {canEdit ? (
                <select value={slot.memberId ?? ''} onChange={event => onMemberChange(slotIndex, event.target.value)} className="min-w-0 flex-1 appearance-none bg-transparent text-xs text-slate-200 outline-none">
                  <option value="">Vị trí trống</option>
                  {availableMembers.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
                </select>
              ) : <span className="min-w-0 flex-1 truncate text-xs text-slate-300">{slot.member?.name ?? 'Vị trí trống'}</span>}
              {canEdit && slot.member && <button type="button" onClick={() => onMemberChange(slotIndex, '')} className="text-slate-600 hover:text-red-300" aria-label="Gỡ thành viên"><UserMinus size={13} /></button>}
            </div>
          );
        })}
      </div>
    </article>
  );
}

function DivisionLane({ division, index, children }: { key?: React.Key; division: GvgLineupDivision; index: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `division-${index}`, data: { divisionIndex: index } });
  return <section ref={setNodeRef} className={`app-surface rounded-2xl border p-4 ${isOver ? 'border-sky-400/70 ring-2 ring-sky-400/20' : 'border-slate-700/70'}`}>
    <div className="mb-3 flex items-center justify-between"><h2 className="font-black uppercase tracking-widest text-sky-200">Đoàn {index + 1}</h2><span className="rounded-full border border-slate-700 bg-slate-950/60 px-2 py-1 text-[11px] font-bold text-slate-400">{division.squads.length}/{SQUADS_PER_DIVISION} tổ đội</span></div>
    <div className="custom-scrollbar flex min-h-[310px] gap-3 overflow-x-auto pb-2">{children}</div>
  </section>;
}

function NewDivisionDropZone() {
  const { setNodeRef, isOver } = useDroppable({ id: 'new-division' });
  return <div ref={setNodeRef} className={`flex min-h-24 items-center justify-center rounded-2xl border border-dashed px-4 text-sm font-bold transition-colors ${isOver ? 'border-sky-300 bg-sky-500/15 text-sky-100' : 'border-slate-600 bg-slate-900/35 text-slate-400'}`}><Plus size={18} className="mr-2" />Kéo tổ đội vào đây để tạo đoàn mới</div>;
}

export function GvgLineupWorkspace({ lineup, members, canEdit, onLineupChange, onReload }: Props) {
  const { alert, confirm } = useSystemDialog();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [activeSquad, setActiveSquad] = React.useState<number | null>(null);
  const [saving, setSaving] = React.useState(false);

  const persist = React.useCallback(async (next: GvgLineup) => {
    onLineupChange(next);
    if (!canEdit) return;
    setSaving(true);
    try {
      onLineupChange(await saveGvgLineup(toSavePayload(next)));
    } catch (error) {
      await alert({ title: 'Không thể lưu đội hình', message: error instanceof Error ? error.message : 'Vui lòng thử lại.', variant: 'error' });
      await onReload();
    } finally { setSaving(false); }
  }, [alert, canEdit, onLineupChange, onReload]);

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveSquad(null);
    if (!lineup || !canEdit || !event.active.data.current) return;
    const squadNumber = event.active.data.current.squadNumber as number;
    if (event.over?.id === 'new-division') {
      const next = moveSquadToNewDivision(lineup, squadNumber);
      if (next !== lineup) await persist(next);
      return;
    }
    const targetDivisionIndex = event.over?.data.current?.divisionIndex;
    if (typeof targetDivisionIndex !== 'number') return;
    const targetSquadIndex = typeof event.over?.data.current?.squadIndex === 'number'
      ? event.over.data.current.squadIndex
      : lineup.divisions[targetDivisionIndex].squads.length;
    const next = moveSquad(lineup, squadNumber, targetDivisionIndex, targetSquadIndex);
    if (next !== lineup) await persist(next);
  };

  if (!lineup) return <div className="flex h-full items-center justify-center text-slate-400">Đang tải đội hình Bang Chiến...</div>;

  return <div className="custom-scrollbar h-full overflow-y-auto p-4 sm:p-6"><div className="mx-auto max-w-[1600px] space-y-4">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-sky-300">Bang Chiến</p><h1 className="mt-1 text-2xl font-black text-white">Đội hình Bang Chiến</h1><p className="mt-1 text-sm text-slate-400">10 tổ đội cố định · {lineup.divisions.length}/5 đoàn · Mỗi tổ tối đa 6 thành viên</p></div>{saving && <span className="text-xs font-bold text-sky-300">Đang lưu...</span>}</div>
    {!canEdit && <p className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">Chỉ bang chủ có quyền chỉnh sửa đội hình.</p>}
    <DndContext sensors={sensors} onDragStart={event => setActiveSquad(event.active.data.current?.squadNumber as number)} onDragCancel={() => setActiveSquad(null)} onDragEnd={handleDragEnd}>
      <div className="space-y-4">{lineup.divisions.map((division, divisionIndex) => <DivisionLane key={division.id} division={division} index={divisionIndex}>{division.squads.map((squad, squadIndex) => <SquadCard key={squad.id} squad={squad} divisionIndex={divisionIndex} squadIndex={squadIndex} members={members} canEdit={canEdit} onMemberChange={async (slotIndex, memberId) => { const member = members.find(item => item.id === memberId) ?? null; await persist(setSquadMember(lineup, squad.squadNumber, slotIndex, member ? { id: member.id, name: member.name, classType: member.classType } : null)); }} onClear={async () => { if (!await confirm({ title: `Làm trống Tổ đội ${squad.squadNumber}?`, message: 'Tất cả thành viên sẽ được gỡ khỏi tổ đội. Tổ đội và vị trí trong đoàn vẫn được giữ.', variant: 'danger', confirmLabel: 'Làm trống' })) return; setSaving(true); try { onLineupChange(await clearGvgLineupSquad(squad.squadNumber)); } catch (error) { await alert({ message: error instanceof Error ? error.message : 'Không thể làm trống tổ đội.', variant: 'error' }); } finally { setSaving(false); } }} />)}</DivisionLane>)}</div>
      {canEdit && lineup.divisions.length < 5 && <NewDivisionDropZone />}
      <DragOverlay>{activeSquad ? <div className="rounded-lg border border-sky-300 bg-slate-900 px-4 py-2 text-sm font-black text-white shadow-2xl">Tổ đội {activeSquad}</div> : null}</DragOverlay>
    </DndContext>
  </div></div>;
}
