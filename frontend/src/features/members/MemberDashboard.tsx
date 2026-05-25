/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Trash2, Filter, X, UserCircle, AlertTriangle, Settings, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Member, ClassType } from '../../types.ts';
import { AppStateResponse, DiscordUser, fetchCurrentDiscordRoles } from '../../services/discordApi.ts';
import { CLASSES, CLASS_COLORS, CLASS_ICONS, UNKNOWN_CLASS, CONFLICT_CLASS } from '../../constants.ts';
import { cn } from '../../lib/utils.ts';
import { getErrorMessage } from '../../lib/error.ts';
import { useSystemDialog } from '../app/SystemDialogProvider.tsx';
import { AppMonthPickerPanel } from '../../components/ui/AppMonthPicker.tsx';
import { AppSelect } from '../../components/ui/AppSelect.tsx';

interface MemberDashboardProps {
  members: Member[];
  gvgParticipationMonth: string;
  onGvgParticipationMonthChange: (month: string) => void;
  onImport: (members: Member[]) => void;
  onDelete: (memberId: string) => void | Promise<void>;
  onAcknowledgeClassChange: (memberId: string) => void;
  onUpdateIngameName: (memberId: string, ingameName: string) => Promise<void>;
  onUpdateMemberClassRole: (memberId: string, classType: ClassType) => Promise<void>;
  onUpdateMyIngameName: (ingameName: string) => Promise<void>;
  currentUser: DiscordUser | null;
  currentRole: 'owner' | 'manager' | 'member' | null;
  canManageMembers: boolean;
  canManageSettings: boolean;
  canSelfService: boolean;
  roleConfig: AppStateResponse['roleConfig'];
  onUpdateRoleConfig: (classRoleMap: Record<string, string>, requiredRoles: string[], accessRoles?: { managerRoles: string[]; memberRoles: string[] }) => Promise<void>;
  onResetCurrentGuildData: (confirmation: string) => Promise<void>;
  lastSyncedAt?: string | null;
}

type SortField = 'discordUsername' | 'ingameName' | 'classType' | 'joinedAt' | 'gvgParticipationCount';
type SortDirection = 'asc' | 'desc';

const CLASS_FILTER_OPTIONS: Array<ClassType | 'all'> = ['all', ...CLASSES, UNKNOWN_CLASS, CONFLICT_CLASS];

const sortText = (a: string | null | undefined, b: string | null | undefined) => {
  const left = a?.trim() || '~~~~';
  const right = b?.trim() || '~~~~';
  return left.localeCompare(right, 'vi');
};

const sortDate = (a?: string | null, b?: string | null) => {
  const left = a ? new Date(a).getTime() : Number.MAX_SAFE_INTEGER;
  const right = b ? new Date(b).getTime() : Number.MAX_SAFE_INTEGER;
  return left - right;
};

export const MemberDashboard: React.FC<MemberDashboardProps> = ({
  members,
  gvgParticipationMonth,
  onGvgParticipationMonthChange,
  onImport,
  onDelete,
  onAcknowledgeClassChange,
  onUpdateIngameName,
  onUpdateMemberClassRole,
  onUpdateMyIngameName,
  currentUser,
  currentRole,
  canManageMembers,
  canManageSettings,
  canSelfService,
  roleConfig,
  onUpdateRoleConfig,
  onResetCurrentGuildData,
  lastSyncedAt,
}) => {
  const { confirm } = useSystemDialog();
  const classFilterRef = useRef<HTMLDivElement | null>(null);
  const gvgMonthFilterRef = useRef<HTMLDivElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState<ClassType | 'all'>('all');
  const [classFilterOpen, setClassFilterOpen] = useState(false);
  const [gvgMonthFilterOpen, setGvgMonthFilterOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('discordUsername');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [isRoleConfigOpen, setIsRoleConfigOpen] = useState(false);
  const [myIngameName, setMyIngameName] = useState('');
  const [mySaving, setMySaving] = useState(false);

  const selfMember = useMemo(() => {
    if (!currentUser?.id) return null;
    return members.find(member => member.discordId === currentUser.id) || null;
  }, [members, currentUser]);

  const selectedMember = useMemo(() => {
    if (!selectedMemberId) return null;
    return members.find(member => member.id === selectedMemberId) || null;
  }, [members, selectedMemberId]);

  useEffect(() => {
    setMyIngameName(selfMember?.ingameName || selfMember?.name || '');
  }, [selfMember]);

  useEffect(() => {
    if (!classFilterOpen && !gvgMonthFilterOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (classFilterRef.current?.contains(target)) return;
      if (gvgMonthFilterRef.current?.contains(target)) return;
      setClassFilterOpen(false);
      setGvgMonthFilterOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [classFilterOpen, gvgMonthFilterOpen]);

  const myTrimmedName = myIngameName.trim();
  const canSaveMyIngameName = !!selfMember && myTrimmedName.length > 0 && myTrimmedName !== (selfMember.ingameName || selfMember.name);

  const handleSaveMyIngameName = async () => {
    if (!canSaveMyIngameName) return;
    setMySaving(true);
    try {
      await onUpdateMyIngameName(myTrimmedName);
    } finally {
      setMySaving(false);
    }
  };

  const showSelfServicePanel = canSelfService;
  const allowMemberManagement = canManageMembers;


  // Stats
  const stats = useMemo(() => {
    const total = members.length;
    const byClass = CLASSES.reduce((acc, cls) => {
      acc[cls] = members.filter(m => m.classType === cls).length;
      return acc;
    }, {} as Record<ClassType, number>);
    return { total, byClass };
  }, [members]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(direction => direction === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortField(field);
    setSortDirection('asc');
  };

  // Filter and sort
  const filteredMembers = useMemo(() => {
    let result = [...members];

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(m => [m.name, m.ingameName, m.discordDisplayName, m.discordUsername]
        .filter(Boolean)
        .some(value => value!.toLowerCase().includes(query))
      );
    }

    // Filter by class
    if (filterClass !== 'all') {
      result = result.filter(m => m.classType === filterClass);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'discordUsername') {
        comparison = sortText(a.discordUsername || a.name, b.discordUsername || b.name);
      } else if (sortField === 'ingameName') {
        comparison = sortText(a.ingameName, b.ingameName);
      } else if (sortField === 'classType') {
        comparison = sortText(a.classType, b.classType);
      } else if (sortField === 'gvgParticipationCount') {
        comparison = (a.gvgParticipationCount ?? 0) - (b.gvgParticipationCount ?? 0);
      } else {
        comparison = sortDate(a.joinedAt, b.joinedAt);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [members, searchQuery, filterClass, sortField, sortDirection]);

  const getMemberAvatar = (member: Member) => {
    if (member.avatar) {
      return `https://cdn.discordapp.com/avatars/${member.discordId}/${member.avatar}.png?size=64`;
    }
    return null;
  };

  const confirmDeleteMember = async (member: Member) => {
    const confirmed = await confirm({
      message: `Gỡ role Bang Viên của "${member.name}" trên Discord và xóa khỏi danh sách webapp?`,
      variant: 'danger',
      confirmLabel: 'Gỡ role',
    });
    if (!confirmed) return;

    void onDelete(member.id);
  };

  const getRoleLabel = () => {
    if (currentRole === 'owner') return 'Bang chủ';
    if (currentRole === 'manager') return 'Quản lý';
    if (currentRole === 'member') return 'Bang Viên';
    return 'Chưa xác định';
  };

  const formatJoinedDays = (joinedAt?: string | null) => {
    if (!joinedAt) return 'Chưa có dữ liệu';
    const joinedTime = new Date(joinedAt).getTime();
    if (Number.isNaN(joinedTime)) return 'Chưa có dữ liệu';

    const diffDays = Math.max(0, Math.floor((Date.now() - joinedTime) / 86400000));
    return `${diffDays} ngày`;
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex h-full overflow-hidden">
        <aside className="w-80 shrink-0 border-r border-slate-800/80 bg-slate-950/35 overflow-y-auto custom-scrollbar backdrop-blur-sm">
          <div className="p-5 space-y-5">
            <section className="overflow-hidden rounded-2xl border border-sky-400/25 bg-gradient-to-br from-sky-500/14 via-slate-900/70 to-indigo-500/10 shadow-xl shadow-sky-950/15">
              <div className="border-b border-sky-400/15 px-4 py-3 text-center">
                <h2 className="text-base font-black text-white">Thông tin của tôi</h2>
                <p className="mt-1 text-[11px] text-slate-400">Thông tin cá nhân trong server</p>
              </div>
              {selfMember ? (
                <div className="space-y-3 p-4">
                  <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-950/35 p-4 text-center">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-600/70 bg-slate-900/80">
                      {getMemberAvatar(selfMember) ? (
                        <img src={getMemberAvatar(selfMember)!} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-lg font-black text-sky-200">{(selfMember.ingameName || selfMember.name)[0]?.toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0 w-full">
                      <p className="truncate text-sm font-black text-slate-100">{selfMember.ingameName || 'Chưa cập nhật tên ingame'}</p>
                      <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                        <span className="rounded-full border border-sky-400/25 bg-sky-500/12 px-2 py-0.5 text-[10px] font-bold text-sky-200">{getRoleLabel()}</span>
                        <span
                          className="rounded-full border px-2 py-0.5 text-[10px] font-bold"
                          style={{ color: CLASS_COLORS[selfMember.classType], borderColor: `${CLASS_COLORS[selfMember.classType]}55`, backgroundColor: `${CLASS_COLORS[selfMember.classType]}14` }}
                        >
                          {selfMember.classType}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <MyInfoRow label="Tham gia Discord" value={formatJoinedDays(selfMember.joinedAt)} />
                    <MyInfoRow label="Discord" value={selfMember.discordUsername ? `@${selfMember.discordUsername}` : selfMember.discordDisplayName || 'Chưa có dữ liệu'} />
                  </div>
                </div>
              ) : (
                <p className="p-4 text-xs text-slate-500">Không tìm thấy thông tin thành viên của bạn.</p>
              )}
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider">
                <span className="flex items-center gap-2 text-slate-400">
                  <Filter size={12} />
                  Thống kê phái
                </span>
                <span className="rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black text-emerald-200 shadow-sm shadow-emerald-950/20">
                  {stats.total} người
                </span>
              </div>
              <div className="space-y-2">
                {CLASSES.map(cls => (
                  <ClassStatRow
                    key={cls}
                    label={cls}
                    value={stats.byClass[cls]}
                    color={CLASS_COLORS[cls]}
                    icon={CLASS_ICONS[cls]}
                  />
                ))}
              </div>
            </section>

            {canManageSettings && (
              <button
                onClick={() => setIsRoleConfigOpen(true)}
                className="app-button-primary flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold"
                title="Cấu hình role"
              >
                <Settings size={14} />
                Cài đặt
              </button>
            )}
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-950/25 shrink-0 space-y-4">
            <div className="app-surface-soft rounded-xl p-3 space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <Filter size={12} />
                Bộ lọc
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[minmax(220px,1fr)_auto] gap-3 items-end">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                    Tìm kiếm
                  </label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Tìm tên thành viên..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-slate-700/80 bg-slate-800/70 py-2 pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400/70"
                    />
                  </div>
                </div>

                {(filterClass !== 'all' || searchQuery) && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilterClass('all');
                    }}
                    className="flex items-center justify-center gap-1 rounded-lg border border-slate-700/80 bg-slate-800/70 px-3 py-2 text-[11px] font-bold text-slate-300 transition-colors hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-300"
                  >
                    <X size={12} />
                    Xóa bộ lọc
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full table-fixed">
                <thead className="sticky top-0 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-sm">
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="w-12 px-3 py-3 text-center">STT</th>
                    <th className="w-[22%] px-3 py-3 text-left">
                      <SortableHeader label="Thành viên" field="discordUsername" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                    </th>
                    <th className="w-[26%] px-3 py-3 text-left">
                      <SortableHeader label="Tên ingame" field="ingameName" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                    </th>
                    <th className="w-[18%] px-3 py-3 text-left">
                      <div ref={classFilterRef} className="relative inline-flex max-w-full items-center gap-1.5">
                        <SortableHeader label="Phái" field="classType" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                        <button
                          type="button"
                          onClick={event => {
                            event.stopPropagation();
                            setClassFilterOpen(open => !open);
                          }}
                          className={cn(
                            'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors',
                            filterClass !== 'all'
                              ? 'border-sky-400/45 bg-sky-500/20 text-sky-200'
                              : 'border-slate-700/80 bg-slate-900/80 text-slate-400 hover:border-slate-500 hover:text-slate-100',
                          )}
                          title="Lọc phái"
                        >
                          <Filter size={12} />
                        </button>
                        {classFilterOpen && (
                          <div
                            className="absolute left-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950/98 p-1.5 shadow-2xl shadow-slate-950/50 normal-case tracking-normal"
                            onClick={event => event.stopPropagation()}
                          >
                            {CLASS_FILTER_OPTIONS.map(option => {
                              const active = filterClass === option;
                              return (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() => {
                                    setFilterClass(option);
                                    setClassFilterOpen(false);
                                  }}
                                  className={cn(
                                    'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-[11px] font-bold transition-colors',
                                    active
                                      ? 'bg-sky-500/20 text-sky-100'
                                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white',
                                  )}
                                >
                                  <span className="truncate">{option === 'all' ? 'Tất cả phái' : option}</span>
                                  {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-300" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </th>
                    <th className="w-[15%] px-3 py-3 text-center">
                      <SortableHeader label="Ngày tham gia" field="joinedAt" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} align="center" />
                    </th>
                    <th className="w-[15%] px-3 py-3 text-center">
                      <div ref={gvgMonthFilterRef} className="relative inline-flex max-w-full items-center justify-center gap-1.5">
                        <SortableHeader label="Bang chiến tháng" field="gvgParticipationCount" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} align="center" />
                        <button
                          type="button"
                          onClick={event => {
                            event.stopPropagation();
                            setGvgMonthFilterOpen(open => !open);
                          }}
                          className={cn(
                            'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors',
                            gvgMonthFilterOpen
                              ? 'border-sky-400/45 bg-sky-500/20 text-sky-200'
                              : 'border-slate-700/80 bg-slate-900/80 text-slate-400 hover:border-slate-500 hover:text-slate-100',
                          )}
                          title={`Lọc tháng bang chiến: ${gvgParticipationMonth}`}
                        >
                          <Filter size={12} />
                        </button>
                        {gvgMonthFilterOpen && (
                          <div
                            className="absolute right-0 top-full z-30 mt-2 w-72 rounded-xl border border-slate-700/80 bg-slate-950/98 p-3 shadow-2xl shadow-slate-950/50 normal-case tracking-normal"
                            onClick={event => event.stopPropagation()}
                          >
                            <div className="mb-3">
                              <div className="text-xs font-black text-slate-100">Chọn tháng bang chiến</div>
                              <div className="mt-0.5 text-[11px] font-bold text-slate-500">Chọn tháng rồi bấm Áp dụng.</div>
                            </div>
                            <AppMonthPickerPanel
                              value={gvgParticipationMonth}
                              onChange={value => {
                                onGvgParticipationMonthChange(value);
                                setGvgMonthFilterOpen(false);
                              }}
                              onCancel={() => setGvgMonthFilterOpen(false)}
                            />
                          </div>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-16 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center">
                          <UserCircle size={48} className="mb-3 opacity-50" />
                          <p className="text-sm font-medium">Không có thành viên thỏa điều kiện lọc</p>
                          <p className="mt-1 text-xs">Điều chỉnh bộ lọc để xem thêm thành viên</p>
                        </div>
                      </td>
                    </tr>
                  )}
                  {filteredMembers.map((member, index) => (
                    <tr
                      key={member.id}
                      onClick={() => {
                        if (allowMemberManagement) setSelectedMemberId(member.id);
                      }}
                      className="border-b border-slate-800/55 hover:bg-slate-800/45 cursor-pointer transition-colors"
                    >
                      <td className="px-3 py-3 text-center text-xs font-bold text-slate-500">
                        {index + 1}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                            {getMemberAvatar(member) ? (
                              <img
                                src={getMemberAvatar(member)!}
                                alt=""
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span className="text-sm font-bold text-slate-400">
                                {member.name[0]?.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2">
                              <p className="truncate text-xs font-semibold text-slate-400">{member.discordUsername ? `@${member.discordUsername}` : member.name}</p>
                              {member.previousClassType && member.previousClassType !== member.classType && (
                                <span
                                  className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded"
                                  title={`Đã đổi phái: ${member.previousClassType} → ${member.classType}`}
                                >
                                  <AlertTriangle size={10} />
                                  Đổi phái
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn('block truncate text-xs font-bold', member.ingameName ? 'text-slate-200' : 'text-slate-500')}>
                          {member.ingameName || 'Chưa cập nhật'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className="inline-block max-w-full truncate rounded px-2 py-1 text-[11px] font-bold"
                          style={{
                            backgroundColor: `${CLASS_COLORS[member.classType]}20`,
                            color: CLASS_COLORS[member.classType],
                          }}
                        >
                          {member.classType}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-xs text-slate-400">
                        {formatJoinedDays(member.joinedAt)}
                      </td>
                      <td className="px-3 py-3 text-center text-sm font-black text-violet-200">
                        {member.gvgParticipationCount ?? 0} trận
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
        </main>
      </div>

      {/* Member detail modal */}
      {canManageSettings && isRoleConfigOpen && (
        <RoleConfigModal
          roleConfig={roleConfig}
          onClose={() => setIsRoleConfigOpen(false)}
          canResetGuildData={currentRole === 'owner'}
          onResetCurrentGuildData={async (confirmation) => {
            await onResetCurrentGuildData(confirmation);
            setIsRoleConfigOpen(false);
          }}
          onSave={async (classRoleMap, requiredRoles, accessRoles) => {
            await onUpdateRoleConfig(classRoleMap, requiredRoles, accessRoles);
            setIsRoleConfigOpen(false);
          }}
        />
      )}

      {allowMemberManagement && selectedMember && (
        <MemberDetailModal
          member={selectedMember}
          onClose={() => setSelectedMemberId(null)}
          onDelete={() => {
            confirmDeleteMember(selectedMember);
            setSelectedMemberId(null);
          }}
          onAcknowledgeClassChange={() => {
            onAcknowledgeClassChange(selectedMember.id);
            setSelectedMemberId(null);
          }}
          roleConfig={roleConfig}
          onUpdateIngameName={onUpdateIngameName}
          onUpdateMemberClassRole={onUpdateMemberClassRole}
        />
      )}
    </div>
  );
};

interface SortableHeaderProps {
  label: string;
  field: SortField;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  align?: 'left' | 'center' | 'right';
}

const SortableHeader: React.FC<SortableHeaderProps> = ({ label, field, sortField, sortDirection, onSort, align = 'left' }) => {
  const active = sortField === field;
  const Icon = active ? (sortDirection === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-[10px] font-black uppercase tracking-wider transition-colors',
        align === 'left' && '-ml-1.5',
        align === 'center' && 'mx-auto justify-center text-center',
        align === 'right' && '-mr-1.5 ml-auto justify-end text-right',
        active ? 'bg-sky-500/15 text-sky-200' : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100',
      )}
    >
      <span className="truncate">{label}</span>
      <Icon size={11} className="shrink-0" />
    </button>
  );
};

interface MyInfoRowProps {
  label: string;
  value: string;
  valueColor?: string;
}

const MyInfoRow: React.FC<MyInfoRowProps> = ({ label, value, valueColor }) => {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      <span className="text-xs font-bold text-slate-200 text-right truncate" style={{ color: valueColor }}>{value}</span>
    </div>
  );
};

interface ClassStatRowProps {
  label: ClassType;
  value: number;
  color: string;
  icon: string;
}

const ClassStatRow: React.FC<ClassStatRowProps> = ({ label, value, color, icon }) => {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/80 px-3 py-2 shadow-sm shadow-slate-950/10"
      style={{
        background: `linear-gradient(135deg, ${color}1f 0%, rgba(15, 23, 42, 0.62) 72%)`,
      }}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <img src={icon} alt="" className="h-7 w-7 shrink-0 object-contain" />
        <span className="truncate text-[12px] font-bold text-slate-100" title={label}>
          {label}
        </span>
      </div>
      <span
        className="min-w-8 shrink-0 rounded-md border px-2 py-0.5 text-center text-[11px] font-black"
        style={{
          color,
          borderColor: `${color}55`,
          backgroundColor: `${color}14`,
        }}
      >
        {value}
      </span>
    </div>
  );
};

interface RoleConfigModalProps {
  roleConfig: AppStateResponse['roleConfig'];
  canResetGuildData: boolean;
  onClose: () => void;
  onResetCurrentGuildData: (confirmation: string) => Promise<void>;
  onSave: (classRoleMap: Record<string, string>, requiredRoles: string[], accessRoles: { managerRoles: string[]; memberRoles: string[] }) => Promise<void>;
}

const RoleConfigModal: React.FC<RoleConfigModalProps> = ({ roleConfig, canResetGuildData, onClose, onResetCurrentGuildData, onSave }) => {
  const [allRoles, setAllRoles] = useState<string[]>([]);
  const [classRoleMap, setClassRoleMap] = useState<Record<ClassType, string>>(
    Object.fromEntries(CLASSES.map(cls => [cls, roleConfig?.classRoleMap[cls] || ''])) as Record<ClassType, string>
  );
  const [requiredRoles, setRequiredRoles] = useState<string[]>(roleConfig?.requiredRoles || []);
  const [managerRoles, setManagerRoles] = useState<string[]>(roleConfig?.accessRoles?.managerRoles || []);
  const [newRequiredRole, setNewRequiredRole] = useState('');
  const [newManagerRole, setNewManagerRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState('');
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCurrentDiscordRoles()
      .then(roles => setAllRoles(roles.map(role => role.roleName)))
      .catch((err) => setError(getErrorMessage(err, 'Không thể tải danh sách role')))
      .finally(() => setLoading(false));
  }, []);

  const addRequiredRole = (role: string) => {
    if (!role || requiredRoles.includes(role)) return;
    setRequiredRoles(prev => [...prev, role]);
    setNewRequiredRole('');
  };

  const addManagerRole = (role: string) => {
    if (!role || managerRoles.includes(role)) return;
    setManagerRoles(prev => [...prev, role]);
    setNewManagerRole('');
  };

  const handleResetGuildData = async () => {
    if (resetConfirmation !== 'RESET') return;

    setResetting(true);
    setError('');
    try {
      await onResetCurrentGuildData(resetConfirmation);
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể reset dữ liệu server'));
    } finally {
      setResetting(false);
    }
  };

  const handleSave = async () => {
    const unmappedClasses = CLASSES.filter(cls => !classRoleMap[cls]);
    if (unmappedClasses.length > 0) {
      setError(`Còn phái chưa được gán role: ${unmappedClasses.join(', ')}`);
      return;
    }
    const usedRoles = Object.values(classRoleMap);
    if (new Set(usedRoles).size !== usedRoles.length) {
      setError('Một role không thể gán cho nhiều phái');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onSave(classRoleMap, requiredRoles, { managerRoles, memberRoles: requiredRoles });
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể lưu cấu hình role'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-slate-100">Cấu hình Discord Role</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Role bắt buộc là điều kiện vào webapp; role quản lý sẽ được nâng quyền.</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg px-3 py-2 text-xs">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-slate-500 text-sm">Đang tải danh sách role...</div>
          ) : (
            <>
              <section className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Role bắt buộc / thành viên</label>
                  <p className="mt-1 text-[11px] text-slate-500">Người dùng phải có các role này để vào webapp; nếu không có role quản lý thì sẽ là thành viên.</p>
                </div>
                <div className="flex gap-2">
                  <AppSelect
                    value={newRequiredRole}
                    onChange={e => setNewRequiredRole(e.target.value)}
                    className="flex-1"
                  >
                    <option value="">Chọn role...</option>
                    {allRoles.filter(role => !requiredRoles.includes(role)).map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </AppSelect>
                  <button
                    onClick={() => addRequiredRole(newRequiredRole)}
                    className="px-3 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    Thêm
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {requiredRoles.length === 0 ? (
                    <span className="text-xs text-amber-300">Chưa có role bắt buộc; nên chọn role Bang Viên để giới hạn truy cập webapp.</span>
                  ) : requiredRoles.map(role => (
                    <button
                      key={role}
                      onClick={() => setRequiredRoles(prev => prev.filter(item => item !== role))}
                      className="px-2 py-1 bg-slate-800 hover:bg-red-500/20 border border-slate-700 hover:border-red-500/30 rounded text-[11px] text-slate-300 hover:text-red-300 transition-colors"
                    >
                      {role} ×
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Role quản lý</label>
                  <p className="mt-1 text-[11px] text-slate-500">Người có role bắt buộc và một trong các role này sẽ được quyền quản lý.</p>
                </div>
                <AccessRolePicker
                  title="Role quản lý"
                  roles={managerRoles}
                  selectedRole={newManagerRole}
                  availableRoles={allRoles.filter(role => !managerRoles.includes(role))}
                  onSelectedRoleChange={setNewManagerRole}
                  onAddRole={() => addManagerRole(newManagerRole)}
                  onRemoveRole={role => setManagerRoles(prev => prev.filter(item => item !== role))}
                  emptyText="Chưa có role quản lý"
                />
              </section>

              <section className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ánh xạ phái</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CLASSES.map(cls => (
                    <div key={cls} className="space-y-1.5">
                      <span className="text-xs font-bold" style={{ color: CLASS_COLORS[cls] }}>{cls}</span>
                      <AppSelect
                        value={classRoleMap[cls] || ''}
                        onChange={e => setClassRoleMap(prev => ({ ...prev, [cls]: e.target.value }))}
                        className="w-full"
                      >
                        <option value="">Chọn role...</option>
                        {allRoles.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </AppSelect>
                    </div>
                  ))}
                </div>
              </section>

              {canResetGuildData && (
                <section className="space-y-3 rounded-xl border border-red-500/30 bg-red-500/8 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-300" />
                    <div>
                      <label className="text-[10px] font-bold text-red-300 uppercase tracking-wider block">Khu vực nguy hiểm</label>
                      <p className="mt-1 text-[11px] text-red-100/80">
                        Reset sẽ xóa dữ liệu server hiện tại: thành viên đã import, đội hình, kỹ năng, đội hình đã lưu và điểm danh. Cấu hình role và quyền owner được giữ lại để có thể đồng bộ lại.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nhập RESET để xác nhận</label>
                    <input
                      value={resetConfirmation}
                      onChange={event => setResetConfirmation(event.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/70 border border-red-500/30 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-red-400"
                      placeholder="RESET"
                    />
                  </div>
                  <button
                    onClick={handleResetGuildData}
                    disabled={resetConfirmation !== 'RESET' || resetting}
                    className="flex items-center justify-center gap-2 rounded-lg bg-red-500/20 px-4 py-2 text-xs font-bold text-red-200 transition-colors hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-red-500/20"
                  >
                    <Trash2 size={14} />
                    {resetting ? 'Đang reset...' : 'Reset dữ liệu server hiện tại'}
                  </button>
                </section>
              )}
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-colors">
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={loading || saving}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : 'Lưu & Đồng bộ lại'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface AccessRolePickerProps {
  title: string;
  roles: string[];
  selectedRole: string;
  availableRoles: string[];
  emptyText: string;
  onSelectedRoleChange: (role: string) => void;
  onAddRole: () => void;
  onRemoveRole: (role: string) => void;
}

const AccessRolePicker: React.FC<AccessRolePickerProps> = ({
  title,
  roles,
  selectedRole,
  availableRoles,
  emptyText,
  onSelectedRoleChange,
  onAddRole,
  onRemoveRole,
}) => {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/25 p-3 space-y-2">
      <p className="text-xs font-bold text-slate-200">{title}</p>
      <div className="flex gap-2">
        <AppSelect
          value={selectedRole}
          onChange={event => onSelectedRoleChange(event.target.value)}
          className="flex-1"
        >
          <option value="">Chọn role...</option>
          {availableRoles.map(role => (
            <option key={role} value={role}>{role}</option>
          ))}
        </AppSelect>
        <button
          onClick={onAddRole}
          className="px-3 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-xs font-bold transition-colors"
        >
          Thêm
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {roles.length === 0 ? (
          <span className="text-xs text-slate-500">{emptyText}</span>
        ) : roles.map(role => (
          <button
            key={role}
            onClick={() => onRemoveRole(role)}
            className="px-2 py-1 bg-slate-800 hover:bg-red-500/20 border border-slate-700 hover:border-red-500/30 rounded text-[11px] text-slate-300 hover:text-red-300 transition-colors"
          >
            {role} ×
          </button>
        ))}
      </div>
    </div>
  );
};

// Member detail modal
interface MemberDetailModalProps {
  member: Member;
  roleConfig: AppStateResponse['roleConfig'];
  onClose: () => void;
  onDelete: () => void;
  onAcknowledgeClassChange: () => void;
  onUpdateIngameName: (memberId: string, ingameName: string) => Promise<void>;
  onUpdateMemberClassRole: (memberId: string, classType: ClassType) => Promise<void>;
}

const MemberDetailModal: React.FC<MemberDetailModalProps> = ({ member, roleConfig, onClose, onDelete, onAcknowledgeClassChange, onUpdateIngameName, onUpdateMemberClassRole }) => {
  const [ingameName, setIngameName] = useState(member.ingameName || member.name);
  const [selectedClass, setSelectedClass] = useState<ClassType>(member.classType);
  const [saving, setSaving] = useState(false);
  const [savingClass, setSavingClass] = useState(false);
  const trimmedName = ingameName.trim();
  const mappedClassRole = roleConfig?.classRoleMap[selectedClass] || '';
  const canSave = trimmedName.length > 0 && trimmedName !== (member.ingameName || member.name);
  const canSaveClass = selectedClass !== member.classType && !!mappedClassRole;

  const handleSaveIngameName = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onUpdateIngameName(member.id, trimmedName);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveClassRole = async () => {
    if (!canSaveClass) return;
    setSavingClass(true);
    try {
      await onUpdateMemberClassRole(member.id, selectedClass);
      onClose();
    } finally {
      setSavingClass(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md" onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700/80 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 shadow-2xl shadow-slate-950/60"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative overflow-hidden border-b border-slate-800/80 bg-gradient-to-br from-sky-500/15 via-slate-900/70 to-indigo-500/10 px-6 py-5">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg border border-slate-700/80 bg-slate-950/45 p-2 text-slate-400 transition-colors hover:border-slate-500 hover:bg-slate-900 hover:text-slate-100"
          >
            <X size={16} />
          </button>

          <div className="pr-12">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-200/80">Chi tiết thành viên</p>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-sky-300/20 bg-slate-900/80 shadow-xl shadow-slate-950/35">
                {member.avatar ? (
                  <img
                    src={`https://cdn.discordapp.com/avatars/${member.discordId}/${member.avatar}.png?size=128`}
                    alt=""
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-2xl font-black text-sky-100">
                    {member.name[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-xl font-black text-slate-100">{member.name}</h3>
                {member.discordId && (
                  <p className="mt-1 truncate text-xs font-medium text-slate-400">@{member.discordUsername || 'discord'}</p>
                )}
                <span
                  className="mt-3 inline-flex max-w-full items-center rounded-full border px-3 py-1 text-[11px] font-black"
                  style={{
                    backgroundColor: `${CLASS_COLORS[member.classType]}18`,
                    borderColor: `${CLASS_COLORS[member.classType]}55`,
                    color: CLASS_COLORS[member.classType],
                  }}
                >
                  <span className="truncate">{member.classType}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto p-5 custom-scrollbar">
          <section className="space-y-3 rounded-xl border border-slate-800/80 bg-slate-950/35 p-4 shadow-sm shadow-slate-950/20">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Tên ingame
            </label>
            <div className="flex gap-2">
              <input
                value={ingameName}
                onChange={e => setIngameName(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-slate-700/80 bg-slate-950/60 px-3 py-2 text-xs font-medium text-slate-200 placeholder:text-slate-500 focus:border-sky-400/70 focus:outline-none"
                placeholder="Nhập tên ingame"
              />
              <button
                onClick={handleSaveIngameName}
                disabled={!canSave || saving}
                className="rounded-lg bg-sky-500 px-4 py-2 text-xs font-black text-white shadow-sm shadow-sky-950/20 transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-sky-500"
              >
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-slate-800/80 bg-slate-950/35 p-4 shadow-sm shadow-slate-950/20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Thông tin Discord</p>
            <div className="space-y-2">
              <MyInfoRow label="Tên Discord" value={member.discordDisplayName || member.name} />
              {member.discordUsername && <MyInfoRow label="Username" value={`@${member.discordUsername}`} />}
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-slate-800/80 bg-slate-950/35 p-4 shadow-sm shadow-slate-950/20">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quản lý phái</p>
              <span
                className="max-w-[180px] truncate rounded-full border px-2.5 py-1 text-[11px] font-black"
                style={{
                  backgroundColor: `${CLASS_COLORS[member.classType]}18`,
                  borderColor: `${CLASS_COLORS[member.classType]}55`,
                  color: CLASS_COLORS[member.classType],
                }}
              >
                {member.classType}
              </span>
            </div>
            <div className="flex gap-2">
              <AppSelect
                value={selectedClass}
                onChange={event => setSelectedClass(event.target.value as ClassType)}
                className="flex-1"
              >
                {CLASSES.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </AppSelect>
              <button
                onClick={handleSaveClassRole}
                disabled={!canSaveClass || savingClass}
                className="rounded-lg bg-sky-500 px-4 py-2 text-xs font-black text-white shadow-sm shadow-sky-950/20 transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-sky-500"
              >
                {savingClass ? 'Đang lưu...' : 'Đổi phái'}
              </button>
            </div>
            <p className={cn('text-[11px] font-medium', mappedClassRole ? 'text-slate-500' : 'text-amber-300')}>
              {mappedClassRole ? `Discord role sẽ đồng bộ: ${mappedClassRole}` : 'Chưa cấu hình Discord role cho phái này.'}
            </p>
          </section>

          {member.previousClassType && member.previousClassType !== member.classType && (
            <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 shadow-sm shadow-amber-950/10">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-300" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black">Đã đổi phái:</span>
                    <span className="font-bold">{member.previousClassType} → {member.classType}</span>
                    {member.classChangedAt && (
                      <span className="text-[11px] text-amber-400/80">{new Date(member.classChangedAt).toLocaleString('vi-VN')}</span>
                    )}
                  </div>
                  <button
                    onClick={onAcknowledgeClassChange}
                    className="rounded-lg border border-amber-500/40 bg-amber-500/20 px-3 py-1.5 text-[11px] font-black text-amber-100 transition-colors hover:bg-amber-500/30"
                  >
                    Đã xử lý
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-800/80 bg-slate-950/45 px-5 py-4">
          <button
            onClick={onDelete}
            className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/15 px-4 py-2 text-xs font-black text-red-300 transition-colors hover:bg-red-500/25 hover:text-red-200"
          >
            <Trash2 size={14} />
            Gỡ role Bang Viên
          </button>
        </div>
      </div>
    </div>
  );
};
