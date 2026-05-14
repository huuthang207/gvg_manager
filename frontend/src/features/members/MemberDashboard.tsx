/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Search, Trash2, RefreshCw, Filter, X, CheckCircle, UserCircle, XCircle, AlertTriangle, Settings } from 'lucide-react';
import { Member, ClassType } from '../../types.ts';
import { AppStateResponse, DiscordUser, fetchCurrentDiscordRoles } from '../../services/discordApi.ts';
import { CLASSES, CLASS_COLORS, CLASS_ICONS } from '../../constants.ts';
import { cn } from '../../lib/utils.ts';
import { getErrorMessage } from '../../lib/error.ts';

interface MemberDashboardProps {
  members: Member[];
  onImport: (members: Member[]) => void;
  onDelete: (memberId: string) => void | Promise<void>;
  onRefresh: () => void;
  onAcknowledgeClassChange: (memberId: string) => void;
  onUpdateIngameName: (memberId: string, ingameName: string) => Promise<void>;
  onUpdateMyIngameName: (ingameName: string) => Promise<void>;
  currentUser: DiscordUser | null;
  currentRole: 'owner' | 'manager' | 'member' | null;
  canManageMembers: boolean;
  canManageSettings: boolean;
  canSelfService: boolean;
  roleConfig: AppStateResponse['roleConfig'];
  onUpdateRoleConfig: (classRoleMap: Record<string, string>, requiredRoles: string[], accessRoles?: { managerRoles: string[]; memberRoles: string[] }) => Promise<void>;
  syncing?: boolean;
  lastSyncedAt?: string | null;
}

type FilterStatus = 'active' | 'inactive';
type SortField = 'name' | 'classType';

export const MemberDashboard: React.FC<MemberDashboardProps> = ({
  members,
  onImport,
  onDelete,
  onRefresh,
  onAcknowledgeClassChange,
  onUpdateIngameName,
  onUpdateMyIngameName,
  currentUser,
  currentRole,
  canManageMembers,
  canManageSettings,
  canSelfService,
  roleConfig,
  onUpdateRoleConfig,
  syncing = false,
  lastSyncedAt,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('active');
  const [filterClass, setFilterClass] = useState<ClassType | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('name');
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
    const active = members.filter(m => m.active !== false).length;
    const inactive = total - active;

    return { total, byClass, active, inactive };
  }, [members]);

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

    // Filter by active status
    if (filterStatus === 'inactive') {
      result = result.filter(m => m.active === false);
    } else {
      result = result.filter(m => m.active !== false);
    }

    // Filter by class
    if (filterClass !== 'all') {
      result = result.filter(m => m.classType === filterClass);
    }

    // Sort
    result.sort((a, b) => {
      if (sortField === 'name') {
        return a.name.localeCompare(b.name);
      }
      return a.classType.localeCompare(b.classType);
    });

    return result;
  }, [members, searchQuery, filterStatus, filterClass, sortField]);

  const getMemberAvatar = (member: Member) => {
    if (member.avatar) {
      return `https://cdn.discordapp.com/avatars/${member.discordId}/${member.avatar}.png?size=64`;
    }
    return null;
  };

  const confirmDeleteMember = (member: Member) => {
    const message = member.active === false
      ? `Xóa vĩnh viễn thành viên "${member.name}" khỏi hệ thống?`
      : `Xóa thành viên "${member.name}"?`;

    if (confirm(message)) {
      onDelete(member.id);
    }
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
        <aside className="w-80 shrink-0 border-r border-slate-800 bg-slate-900/50 overflow-y-auto custom-scrollbar">
          <div className="p-5 space-y-5">
            <section className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
              <div>
                <h2 className="text-sm font-bold text-slate-100">Thông tin của tôi</h2>
                <p className="text-[10px] text-slate-500 mt-0.5">Thông tin thành viên trong server</p>
              </div>
              {selfMember ? (
                <div className="space-y-2">
                  <MyInfoRow label="Tên thành viên" value={selfMember.discordDisplayName || selfMember.name} />
                  <MyInfoRow label="Tên ingame" value={selfMember.ingameName || 'Chưa cập nhật'} />
                  <MyInfoRow label="Chức vụ" value={getRoleLabel()} />
                  <MyInfoRow label="Môn phái" value={selfMember.classType} valueColor={CLASS_COLORS[selfMember.classType]} />
                  <MyInfoRow label="Tham gia Discord" value={formatJoinedDays(selfMember.joinedAt)} />
                </div>
              ) : (
                <p className="text-xs text-slate-500">Không tìm thấy thông tin thành viên của bạn.</p>
              )}
            </section>

            <div className="grid grid-cols-3 gap-2">
              <StatCard label="Tổng số" value={stats.total} color="blue" compact />
              <StatCard label="Hoạt động" value={stats.active} color="emerald" compact />
              <StatCard label="Không HĐ" value={stats.inactive} color="red" compact />
            </div>

            <section className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <Filter size={12} />
                Phái
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/35 overflow-hidden">
                {CLASSES.map((cls, index) => (
                  <ClassStatRow
                    key={cls}
                    label={cls}
                    value={stats.byClass[cls]}
                    color={CLASS_COLORS[cls]}
                    icon={CLASS_ICONS[cls]}
                    isLast={index === CLASSES.length - 1}
                  />
                ))}
              </div>
            </section>

            {(allowMemberManagement || canManageSettings) && (
              <div className="grid grid-cols-2 gap-2">
                {allowMemberManagement && (
                  <button
                    onClick={onRefresh}
                    disabled={syncing}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                    {syncing ? 'Đang...' : 'Đồng bộ'}
                  </button>
                )}
                {canManageSettings && (
                  <button
                    onClick={() => setIsRoleConfigOpen(true)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/25 rounded-lg text-xs font-bold transition-colors"
                    title="Cấu hình role"
                  >
                    <Settings size={14} />
                    Cài đặt
                  </button>
                )}
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/30 shrink-0 space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3 space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <Filter size={12} />
                Bộ lọc
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[minmax(220px,1fr)_auto_auto] gap-3 items-end">
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
                      className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                    Trạng thái
                  </label>
                  <div className="flex gap-2">
                    {(['active', 'inactive'] as FilterStatus[]).map(status => (
                      <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={cn(
                          "px-3 py-2 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap",
                          filterStatus === status
                            ? status === 'active' ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                            : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                        )}
                      >
                        {status === 'active' ? 'Hoạt động' : 'Không HĐ'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                    Sắp xếp
                  </label>
                  <div className="flex gap-2">
                    {(['name', 'classType'] as SortField[]).map(field => (
                      <button
                        key={field}
                        onClick={() => setSortField(field)}
                        className={cn(
                          "px-3 py-2 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap",
                          sortField === field
                            ? "bg-blue-500 text-white"
                            : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                        )}
                      >
                        {field === 'name' ? 'Tên' : 'Phái'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                  Lọc theo phái
                </label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setFilterClass('all')}
                    className={cn(
                      "px-3 py-1.5 rounded text-[11px] font-bold transition-colors",
                      filterClass === 'all'
                        ? "bg-blue-500 text-white"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    )}
                  >
                    Tất cả
                  </button>
                  {CLASSES.map(cls => (
                    <button
                      key={cls}
                      onClick={() => setFilterClass(cls)}
                      className={cn(
                        "px-3 py-1.5 rounded text-[11px] font-bold transition-colors",
                        filterClass === cls
                          ? "text-white"
                          : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                      )}
                      style={{
                        backgroundColor: filterClass === cls ? CLASS_COLORS[cls] : undefined,
                      }}
                    >
                      {cls}
                    </button>
                  ))}

                  {(filterStatus !== 'active' || filterClass !== 'all' || searchQuery) && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setFilterStatus('active');
                        setFilterClass('all');
                      }}
                      className="flex items-center gap-1 px-2 text-[11px] text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <X size={12} />
                      Xóa bộ lọc
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar">
            {filteredMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <UserCircle size={48} className="mb-3 opacity-50" />
                <p className="text-sm font-medium">Chưa có thành viên nào</p>
                <p className="text-xs mt-1">Điều chỉnh bộ lọc hoặc đồng bộ Discord để cập nhật danh sách</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 bg-slate-900 border-b border-slate-800">
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="text-center py-3 px-4 w-14">STT</th>
                    <th className="text-left py-3 px-4">Thành viên</th>
                    <th className="text-left py-3 px-4">Phái</th>
                    <th className="text-left py-3 px-4">Trạng thái</th>
                    <th className="text-right py-3 px-4">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member, index) => (
                    <tr
                      key={member.id}
                      onClick={() => {
                        if (allowMemberManagement) setSelectedMemberId(member.id);
                      }}
                      className="border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 text-center text-xs font-bold text-slate-500">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
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
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-slate-200">{member.name}</p>
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
                            {(member.discordDisplayName || member.discordUsername) && (
                              <p className="text-[10px] text-slate-500">
                                {member.discordDisplayName && member.discordDisplayName !== member.name ? member.discordDisplayName : ''}
                                {member.discordUsername ? ` @${member.discordUsername}` : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="text-[11px] font-bold px-2 py-1 rounded"
                          style={{
                            backgroundColor: `${CLASS_COLORS[member.classType]}20`,
                            color: CLASS_COLORS[member.classType],
                          }}
                        >
                          {member.classType}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {member.active === false ? (
                          <span className="flex items-center gap-1.5 text-[11px] text-red-400">
                            <XCircle size={12} />
                            Không hoạt động
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                            <CheckCircle size={12} />
                            Đang hoạt động
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {allowMemberManagement && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              confirmDeleteMember(member);
                            }}
                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>

      {/* Member detail modal */}
      {canManageSettings && isRoleConfigOpen && (
        <RoleConfigModal
          roleConfig={roleConfig}
          onClose={() => setIsRoleConfigOpen(false)}
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
          onUpdateIngameName={onUpdateIngameName}
        />
      )}
    </div>
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

// Stat card component
interface StatCardProps {
  label: string;
  value: number;
  color: string;
  compact?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, color, compact }) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    amber: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    red: 'bg-red-500/10 border-red-500/30 text-red-400',
  };

  return (
    <div className={cn("rounded-lg p-3 border", colors[color], compact && 'p-2')}>
      <p className={cn("font-bold", compact ? "text-lg" : "text-2xl")}>{value}</p>
      <p className={cn("text-[10px] font-bold uppercase tracking-wider opacity-80", compact && 'text-[9px]')}>
        {label}
      </p>
    </div>
  );
};

interface ClassStatRowProps {
  label: ClassType;
  value: number;
  color: string;
  icon: string;
  isLast: boolean;
}

const ClassStatRow: React.FC<ClassStatRowProps> = ({ label, value, color, icon, isLast }) => {
  return (
    <div
      className={cn("flex items-center justify-between gap-3 px-3 py-2.5", !isLast && "border-b border-slate-800/80")}
      style={{
        background: `linear-gradient(90deg, ${color}18 0%, rgba(15, 23, 42, 0) 68%)`,
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <img src={icon} alt="" className="w-9 h-9 object-contain shrink-0" />
        <span className="text-xs font-bold text-slate-100 truncate">{label}</span>
      </div>
      <span
        className="min-w-8 rounded-md border px-2 py-1 text-center text-xs font-black"
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
  onClose: () => void;
  onSave: (classRoleMap: Record<string, string>, requiredRoles: string[], accessRoles: { managerRoles: string[]; memberRoles: string[] }) => Promise<void>;
}

const RoleConfigModal: React.FC<RoleConfigModalProps> = ({ roleConfig, onClose, onSave }) => {
  const [allRoles, setAllRoles] = useState<string[]>([]);
  const [classRoleMap, setClassRoleMap] = useState<Record<ClassType, string>>(
    Object.fromEntries(CLASSES.map(cls => [cls, roleConfig?.classRoleMap[cls] || ''])) as Record<ClassType, string>
  );
  const [requiredRoles, setRequiredRoles] = useState<string[]>(roleConfig?.requiredRoles || []);
  const [managerRoles, setManagerRoles] = useState<string[]>(roleConfig?.accessRoles?.managerRoles || []);
  const [memberRoles, setMemberRoles] = useState<string[]>(roleConfig?.accessRoles?.memberRoles || []);
  const [newRequiredRole, setNewRequiredRole] = useState('');
  const [newManagerRole, setNewManagerRole] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  const addAccessRole = (role: string, appRole: 'manager' | 'member') => {
    if (!role) return;
    if (appRole === 'manager') {
      if (managerRoles.includes(role)) return;
      setManagerRoles(prev => [...prev, role]);
      setNewManagerRole('');
      return;
    }
    if (memberRoles.includes(role)) return;
    setMemberRoles(prev => [...prev, role]);
    setNewMemberRole('');
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
      await onSave(classRoleMap, requiredRoles, { managerRoles, memberRoles });
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
            <p className="text-[11px] text-slate-500 mt-0.5">Lưu cấu hình sẽ đồng bộ lại thành viên, phái và trạng thái hoạt động.</p>
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
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Role bắt buộc</label>
                <div className="flex gap-2">
                  <select
                    value={newRequiredRole}
                    onChange={e => setNewRequiredRole(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Chọn role...</option>
                    {allRoles.filter(role => !requiredRoles.includes(role)).map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => addRequiredRole(newRequiredRole)}
                    className="px-3 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    Thêm
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {requiredRoles.length === 0 ? (
                    <span className="text-xs text-slate-500">Không có role bắt buộc</span>
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
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phân quyền truy cập</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <AccessRolePicker
                    title="Role quản lý"
                    roles={managerRoles}
                    selectedRole={newManagerRole}
                    availableRoles={allRoles.filter(role => !managerRoles.includes(role))}
                    onSelectedRoleChange={setNewManagerRole}
                    onAddRole={() => addAccessRole(newManagerRole, 'manager')}
                    onRemoveRole={role => setManagerRoles(prev => prev.filter(item => item !== role))}
                    emptyText="Chưa có role quản lý"
                  />
                  <AccessRolePicker
                    title="Role thành viên"
                    roles={memberRoles}
                    selectedRole={newMemberRole}
                    availableRoles={allRoles.filter(role => !memberRoles.includes(role))}
                    onSelectedRoleChange={setNewMemberRole}
                    onAddRole={() => addAccessRole(newMemberRole, 'member')}
                    onRemoveRole={role => setMemberRoles(prev => prev.filter(item => item !== role))}
                    emptyText="Mặc định cho thành viên đã import"
                  />
                </div>
              </section>

              <section className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ánh xạ phái</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CLASSES.map(cls => (
                    <div key={cls} className="space-y-1.5">
                      <span className="text-xs font-bold" style={{ color: CLASS_COLORS[cls] }}>{cls}</span>
                      <select
                        value={classRoleMap[cls] || ''}
                        onChange={e => setClassRoleMap(prev => ({ ...prev, [cls]: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Chọn role...</option>
                        {allRoles.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </section>
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
        <select
          value={selectedRole}
          onChange={event => onSelectedRoleChange(event.target.value)}
          className="min-w-0 flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
        >
          <option value="">Chọn role...</option>
          {availableRoles.map(role => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
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
  onClose: () => void;
  onDelete: () => void;
  onAcknowledgeClassChange: () => void;
  onUpdateIngameName: (memberId: string, ingameName: string) => Promise<void>;
}

const MemberDetailModal: React.FC<MemberDetailModalProps> = ({ member, onClose, onDelete, onAcknowledgeClassChange, onUpdateIngameName }) => {
  const [ingameName, setIngameName] = useState(member.ingameName || member.name);
  const [saving, setSaving] = useState(false);
  const trimmedName = ingameName.trim();
  const canSave = trimmedName.length > 0 && trimmedName !== (member.ingameName || member.name);

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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="font-bold text-slate-100">Chi tiết thành viên</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Avatar & Name */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-700 overflow-hidden flex items-center justify-center">
              {member.avatar ? (
                <img
                  src={`https://cdn.discordapp.com/avatars/${member.discordId}/${member.avatar}.png?size=128`}
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-2xl font-bold text-slate-400">
                  {member.name[0]?.toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-200">{member.name}</h4>
              {member.discordId && (
                <p className="text-sm text-slate-500">@{member.discordUsername || 'discord'}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Tên ingame
            </label>
            <div className="flex gap-2">
              <input
                value={ingameName}
                onChange={e => setIngameName(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                placeholder="Nhập tên ingame"
              />
              <button
                onClick={handleSaveIngameName}
                disabled={!canSave || saving}
                className="px-3 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:hover:bg-blue-500"
              >
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/30 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400">Tên Discord</span>
              <span className="text-xs font-medium text-slate-300 text-right">{member.discordDisplayName || member.name}</span>
            </div>
            {member.discordUsername && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-400">Username</span>
                <span className="text-xs font-medium text-slate-300 text-right">@{member.discordUsername}</span>
              </div>
            )}
          </div>

          {/* Class */}
          <div className="flex items-center justify-between py-3 border-b border-slate-800">
            <span className="text-xs text-slate-400">Phái</span>
            <span
              className="text-xs font-bold px-2 py-1 rounded"
              style={{
                backgroundColor: `${CLASS_COLORS[member.classType]}20`,
                color: CLASS_COLORS[member.classType],
              }}
            >
              {member.classType}
            </span>
          </div>

          {member.previousClassType && member.previousClassType !== member.classType && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 text-xs text-amber-300 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} />
                <span>Đã đổi phái: {member.previousClassType} → {member.classType}</span>
                {member.classChangedAt && (
                  <span className="text-amber-500 ml-auto">{new Date(member.classChangedAt).toLocaleString('vi-VN')}</span>
                )}
              </div>
              <button
                onClick={onAcknowledgeClassChange}
                className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded text-[11px] font-bold text-amber-200 transition-colors"
              >
                Đã xử lý
              </button>
            </div>
          )}

          {/* Status */}
          <div className="flex items-center justify-between py-3 border-t border-slate-800">
            <span className="text-xs text-slate-400">Trạng thái</span>
            {member.active === false ? (
              <span className="flex items-center gap-1.5 text-xs text-red-400">
                <XCircle size={12} />
                Không hoạt động (mất role Bang Viên)
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <CheckCircle size={12} />
                Đang hoạt động (còn role Bang Viên)
              </span>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onDelete}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-bold transition-colors"
          >
            <Trash2 size={14} />
            {member.active === false ? 'Xóa vĩnh viễn' : 'Xóa thành viên'}
          </button>
        </div>
      </div>
    </div>
  );
};
