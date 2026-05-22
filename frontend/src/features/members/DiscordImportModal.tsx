/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { X, Users, ChevronRight, AlertCircle, CheckCircle, Loader2, Plus, Shield, Search } from 'lucide-react';
import { DiscordMemberPreview, DiscordGuild, importDiscordMembers, loginWithDiscord, getDiscordGuilds, getBotInviteUrl } from '../../services/discordApi.ts';
import { Member, ClassType } from '../../types.ts';
import { CLASSES, CLASS_COLORS, CONFLICT_CLASS, UNKNOWN_CLASS, getClassColor } from '../../constants.ts';
import { cn } from '../../lib/utils.ts';
import { getErrorMessage } from '../../lib/error.ts';

interface DiscordImportModalProps {
  onImport: (members: Member[]) => void;
  onClose: () => void;
  isAuthenticated: boolean;
}

type Step = 'auth' | 'mapping' | 'preview' | 'done';

export const DiscordImportModal: React.FC<DiscordImportModalProps> = ({ onImport, onClose, isAuthenticated }) => {
  const [step, setStep] = useState<Step>('auth');
  const [loading, setLoading] = useState(false);
  const [loadingGuilds, setLoadingGuilds] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [error, setError] = useState('');
  const [guilds, setGuilds] = useState<DiscordGuild[]>([]);
  const [botInviteUrl, setBotInviteUrl] = useState<string | null>(null);
  const [selectedGuild, setSelectedGuild] = useState<DiscordGuild | null>(null);
  const [members, setMembers] = useState<DiscordMemberPreview[]>([]);
  const [allRoles, setAllRoles] = useState<string[]>([]);

  // Step 2: Role mapping state
  const [classRoleMap, setClassRoleMap] = useState<Record<string, string>>(
    Object.fromEntries(CLASSES.map(c => [c, '']))
  );
  const [requiredRoles, setRequiredRoles] = useState<string[]>([]);
  const [newRequiredRole, setNewRequiredRole] = useState('');

  // Step 3: Selection state
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());

  // Load guilds when modal opens and user is authenticated
  useEffect(() => {
    if (isAuthenticated && guilds.length === 0) {
      loadGuilds();
    }
  }, [isAuthenticated]);

  const loadGuilds = async () => {
    setLoadingGuilds(true);
    setError('');
    try {
      const guildData = await getDiscordGuilds();
      setGuilds(guildData.guilds);

      // Load bot invite URL for servers without bot
      if (guildData.guilds.length === 0) {
        try {
          const url = await getBotInviteUrl();
          setBotInviteUrl(url);
        } catch {
          // Silently fail - invite URL is optional
        }
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể tải danh sách server'));
    } finally {
      setLoadingGuilds(false);
    }
  };

  const handleLogin = () => {
    loginWithDiscord();
  };

  const handleSelectGuild = async (guild: DiscordGuild) => {
    setSelectedGuild(guild);
    setLoading(true);
    setLoadingMembers(true);
    setError('');
    try {
      const data = await importDiscordMembers(guild.id);
      setAllRoles(data.roles.map(r => r.roleName));
      setMembers(data.members);
      setClassRoleMap(Object.fromEntries(CLASSES.map(c => [c, ''])));
      setRequiredRoles([]);
      setStep('mapping');
    } catch (err) {
      const message = getErrorMessage(err, '');
      if (message.includes('403') || message.includes('BOT_NOT_IN_SERVER') || message.includes('Missing Access')) {
        setError(`Bot không có trong server "${guild.name}". Vui lòng thêm bot vào server trước.`);
      } else {
        setError(message || 'Không thể tải danh sách thành viên');
      }
    } finally {
      setLoading(false);
      setLoadingMembers(false);
    }
  };

  // Filtered + auto-mapped members for preview
  const previewMembers = useMemo(() => {
    const mappedClassRoles = Object.entries(classRoleMap)
      .filter(([, r]) => r)
      .map(([cls, role]) => ({ cls: cls as ClassType, role }));

    const required = new Set(requiredRoles);

    return members.filter(member => {
      if (required.size === 0) return true;
      return [...required].every(r => member.roles.includes(r));
    }).map(member => {
      const matchedClasses = mappedClassRoles
        .filter(({ role }) => member.roles.includes(role))
        .map(({ cls }) => cls);
      const classType: ClassType = matchedClasses.length === 1
        ? matchedClasses[0]
        : matchedClasses.length === 0
          ? UNKNOWN_CLASS
          : CONFLICT_CLASS;
      return { ...member, classType };
    });
  }, [members, classRoleMap, requiredRoles]);

  const handleClassRoleChange = (classType: ClassType, role: string) => {
    setClassRoleMap(prev => ({ ...prev, [classType]: role }));
  };

  const handleAddRequiredRole = (role: string) => {
    if (!role || requiredRoles.includes(role)) return;
    setRequiredRoles(prev => [...prev, role]);
    setNewRequiredRole('');
  };

  const handleRemoveRequiredRole = (role: string) => {
    setRequiredRoles(prev => prev.filter(r => r !== role));
  };

  const proceedToPreview = () => {
    const usedRoles = Object.values(classRoleMap).filter(Boolean);
    if (new Set(usedRoles).size !== usedRoles.length) {
      setError('Một role không thể gán cho nhiều phái');
      return;
    }
    setError('');
    setSelectedMembers(new Set(previewMembers.map(m => m.id)));
    setStep('preview');
  };

  const toggleMember = (id: string) => {
    setSelectedMembers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedMembers(new Set(previewMembers.map(m => m.id)));
  const deselectAll = () => setSelectedMembers(new Set());

  const confirmImport = async () => {
    const toImport = previewMembers.filter(m => selectedMembers.has(m.id));

    if (selectedGuild) {
      setLoading(true);
      try {
        await importDiscordMembers(selectedGuild.id, {
          persist: true,
          classRoleMap,
          requiredRoles,
          selectedMemberIds: toImport.map(m => m.id),
        });
      } finally {
        setLoading(false);
      }
    }

    const membersToImport: Member[] = toImport.map(m => ({
      id: `discord-${m.id}`,
      name: m.displayName,
      classType: m.classType,
      discordId: m.id,
      discordUsername: m.username,
      discordRoles: m.roles,
      avatar: m.avatar,
      active: true,
    }));
    onImport(membersToImport);
    setStep('done');
  };

  const getGuildIconUrl = (guild: DiscordGuild) =>
    guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=64` : null;

  const mappedCount = Object.values(classRoleMap).filter(Boolean).length;
  const usedMappedRoles = Object.values(classRoleMap).filter(Boolean);
  const canProceed = new Set(usedMappedRoles).size === usedMappedRoles.length;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: '88vh' }}>

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#5865F2] rounded-lg flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-slate-100 uppercase tracking-widest text-sm">Nhập từ Discord</h3>
              <p className="text-[10px] text-slate-500">
                {step === 'auth' && (isAuthenticated ? 'Chọn Server' : 'Đăng nhập & Chọn Server')}
                {step === 'mapping' && 'Ánh xạ phái & điều kiện'}
                {step === 'preview' && `Xem trước (${previewMembers.length} thành viên)`}
                {step === 'done' && 'Hoàn tất'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-800/50 shrink-0 bg-slate-900/30">
          {(['auth', 'mapping', 'preview', 'done'] as Step[]).map((s, i) => (
            <React.Fragment key={s}>
              {i > 0 && <ChevronRight size={14} className="text-slate-600" />}
              <div className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest transition-all",
                step === s ? "bg-blue-500 text-white" :
                  (['auth', 'mapping', 'preview', 'done'].indexOf(step) > i) ? "bg-emerald-500/20 text-emerald-400" :
                    "bg-slate-800 text-slate-500"
              )}>
                {i + 1}. {s === 'auth' ? 'Server' : s === 'mapping' ? 'Phái' : s === 'preview' ? 'Xem trước' : 'Xong'}
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">

          {/* Step 1: Login + Guild List */}
          {step === 'auth' && (
            <div className="space-y-4">
              {/* Login section - only show when not authenticated */}
              {!isAuthenticated && (
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-slate-200 mb-1 flex items-center gap-2">
                        <AlertCircle size={14} className="text-amber-400" />
                        Yêu cầu
                      </h4>
                      <ul className="text-[12px] text-slate-400 space-y-1 list-disc list-inside">
                        <li>Bot Discord phải có mặt trong server cần nhập</li>
                        <li>Chỉ cần đăng nhập khi cần - không lưu mật khẩu</li>
                      </ul>
                    </div>
                    <button
                      onClick={handleLogin}
                      className="flex items-center gap-2 px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg font-bold text-[11px] transition-all shadow-lg shadow-[#5865F2]/20 shrink-0"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                      </svg>
                      Đăng nhập với Discord
                    </button>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              {/* Loading guilds */}
              {loadingGuilds && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Loader2 size={28} className="text-blue-400 animate-spin" />
                  <p className="text-slate-400 text-[12px]">
                    Đang tải danh sách server...
                  </p>
                </div>
              )}

              {/* Server list - only show when not loading */}
              {!loadingGuilds && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Users size={14} className="text-sky-400" />
                    <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">
                      Server của bạn ({guilds.length})
                    </h4>
                  </div>

                  {guilds.length === 0 && !error && (
                    <div className="text-center py-8 text-slate-500 text-[12px]">
                      <p>Không có server nào có bot quản lý.</p>
                      <p className="mt-2">Vui lòng thêm bot vào server trước.</p>
                      {botInviteUrl && (
                        <a
                          href={botInviteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg font-bold text-[11px] transition-all"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                          </svg>
                          Mời bot vào server
                        </a>
                      )}
                    </div>
                  )}

                  {guilds.length > 0 && (
                    <div className="space-y-2 max-h-[360px] overflow-y-auto custom-scrollbar">
                      {guilds.map(guild => (
                        <div
                          key={guild.id}
                          onClick={() => handleSelectGuild(guild)}
                          className="flex items-center gap-3 bg-slate-800/30 border border-slate-700/40 hover:border-sky-500/50 hover:bg-sky-500/5 rounded-lg px-4 py-3 cursor-pointer transition-all"
                        >
                          <div className="w-10 h-10 rounded-full bg-slate-700 shrink-0 overflow-hidden flex items-center justify-center">
                            {getGuildIconUrl(guild) ? (
                              <img src={getGuildIconUrl(guild)!} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <span className="text-[14px] font-bold text-slate-500">
                                {guild.name[0]?.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-slate-200 truncate">{guild.name}</p>
                            <p className="text-[10px] text-slate-500">{guild.owner ? 'Chủ sở hữu' : 'Thành viên'}</p>
                          </div>
                          <ChevronRight size={16} className="text-slate-600 shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Role Mapping */}
          {step === 'mapping' && (
            <div className="space-y-6">
              {/* Selected guild info - always show */}
              {selectedGuild && (
                <div className="flex items-center gap-3 bg-slate-800/30 rounded-lg px-4 py-2.5 border border-slate-700/40">
                  <div className="w-8 h-8 rounded-full bg-slate-700 shrink-0 overflow-hidden flex items-center justify-center">
                    {getGuildIconUrl(selectedGuild) ? (
                      <img src={getGuildIconUrl(selectedGuild)!} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-[11px] font-bold text-slate-500">
                        {selectedGuild.name[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-[12px] font-bold text-slate-200">{selectedGuild.name}</p>
                    {loadingMembers ? (
                      <p className="text-[10px] text-sky-400 flex items-center gap-1.5">
                        <Loader2 size={10} className="animate-spin" />
                        Đang tải thành viên...
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-500">{members.length} thành viên</p>
                    )}
                  </div>
                  <button
                    onClick={() => setStep('auth')}
                    className="text-[10px] text-slate-500 hover:text-sky-400 font-bold uppercase tracking-widest transition-colors"
                  >
                    ← Chọn server khác
                  </button>
                </div>
              )}

              {/* Loading state */}
              {loadingMembers && (
                <div className="flex flex-col items-center justify-center py-12 gap-5">
                  <div className="relative">
                    <Loader2 size={48} className="text-blue-400 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Users size={20} className="text-sky-300" />
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-slate-300 text-sm font-medium">Đang tải danh sách thành viên...</p>
                    <p className="text-slate-500 text-xs">Quá trình này có thể mất vài giây tùy thuộc vào số lượng thành viên trong server</p>
                  </div>
                </div>
              )}

              {!loadingMembers && (
                <>
                  {/* Progress */}
                  <div className="flex items-center gap-3 bg-slate-800/40 rounded-lg p-3">
                    <Shield size={16} className="text-emerald-400 shrink-0" />
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[11px] font-bold text-slate-300">Ánh xạ phái ({mappedCount}/{CLASSES.length})</span>
                        {canProceed
                          ? <CheckCircle size={14} className="text-emerald-400" />
                          : <span className="text-[10px] text-amber-400">Role bị gán trùng</span>
                        }
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-300"
                          style={{ width: `${(mappedCount / CLASSES.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mapping rows */}
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                      Gán Discord Role cho mỗi phái ({CLASSES.length} phái)
                    </h4>
                    <div className="space-y-2">
                      {CLASSES.map(cls => {
                        const color = CLASS_COLORS[cls];
                        const selectedRole = classRoleMap[cls];
                        return (
                          <RoleMappingRow
                            key={cls}
                            cls={cls}
                            color={color}
                            selectedRole={selectedRole}
                            allRoles={allRoles}
                            classRoleMap={classRoleMap}
                            onChange={handleClassRoleChange}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Required roles */}
                  <div className="border-t border-slate-800 pt-5">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <AlertCircle size={12} className="text-amber-400" />
                      Điều kiện Role bắt buộc (AND logic)
                    </h4>
                    <p className="text-[11px] text-slate-500 mb-3">
                      Thành viên phải có <strong className="text-slate-300">TẤT CẢ</strong> các role bên dưới mới được nhập.
                    </p>

                    {requiredRoles.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {requiredRoles.map(role => (
                          <div
                            key={role}
                            className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-1.5 pr-2"
                          >
                            <span className="text-[11px] font-bold text-amber-300">{role}</span>
                            <button
                              onClick={() => handleRemoveRequiredRole(role)}
                              className="text-amber-500 hover:text-amber-300 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <SearchableSelect
                      value={newRequiredRole}
                      onChange={setNewRequiredRole}
                      options={allRoles.filter(r => !requiredRoles.includes(r) && !Object.values(classRoleMap).includes(r))}
                      placeholder="Tìm và thêm role bắt buộc..."
                      onAdd={() => {
                        if (newRequiredRole) {
                          handleAddRequiredRole(newRequiredRole);
                          setNewRequiredRole('');
                        }
                      }}
                    />
                  </div>
                </>
              )}

              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                  <AlertCircle size={16} /> {error}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">
                  Đã chọn: <strong className="text-slate-200">{selectedMembers.size}/{previewMembers.length}</strong>
                </span>
                <div className="flex gap-2">
                  <button onClick={selectAll} className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-sky-400">Chọn tất cả</button>
                  <span className="text-slate-600">|</span>
                  <button onClick={deselectAll} className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-red-400">Bỏ chọn</button>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 p-3 bg-slate-800/30 rounded-lg">
                {[...CLASSES, UNKNOWN_CLASS, CONFLICT_CLASS].map(cls => {
                  const count = previewMembers.filter(m => m.classType === cls).length;
                  const color = getClassColor(cls);
                  return (
                    <div key={cls} className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">{cls.split(' ').map(s => s[0]).join('')}</span>
                      <span className="text-[11px] font-black" style={{ color }}>{count}</span>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                {previewMembers.map(member => {
                  const color = getClassColor(member.classType);
                  return (
                    <div
                      key={member.id}
                      onClick={() => toggleMember(member.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-all",
                        selectedMembers.has(member.id)
                          ? "bg-sky-500/10 border-sky-500/40"
                          : "bg-slate-800/30 border-slate-700/40 hover:border-slate-600"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                        selectedMembers.has(member.id) ? "bg-blue-500 border-blue-500" : "border-slate-600"
                      )}>
                        {selectedMembers.has(member.id) && <CheckCircle size={12} className="text-white" />}
                      </div>
                      <div className="w-9 h-9 rounded-full bg-slate-700 shrink-0 overflow-hidden flex items-center justify-center">
                        {member.avatar ? (
                          <img src={`https://cdn.discordapp.com/avatars/${member.id}/${member.avatar}.png?size=64`} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-[11px] font-bold text-slate-500">
                            {member.displayName[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-slate-200 truncate">{member.displayName}</p>
                        <p className="text-[10px] text-slate-500 truncate">@{member.username}</p>
                      </div>
                      <div
                        className="text-[10px] font-bold px-2 py-1 rounded shrink-0"
                        style={{ backgroundColor: `${color}20`, border: `1px solid ${color}50`, color }}
                      >
                        {member.classType}
                      </div>
                    </div>
                  );
                })}
              </div>

              {previewMembers.length === 0 && (
                <div className="text-center py-12 text-slate-500 text-sm">
                  <AlertCircle size={32} className="mx-auto mb-2 text-amber-500" />
                  Không có thành viên nào thỏa điều kiện.
                </div>
              )}
            </div>
          )}

          {/* Step 4: Done */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <CheckCircle size={40} className="text-emerald-400" />
              </div>
              <p className="text-slate-200 font-bold text-lg">Đã nhập {selectedMembers.size} thành viên!</p>
              <p className="text-slate-500 text-sm">Thành viên đã được thêm vào danh sách</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex justify-between items-center shrink-0 bg-slate-900/50">
          <button
            onClick={() => {
              if (step === 'auth') onClose();
              else if (step === 'mapping') { setStep('auth'); setMembers([]); setAllRoles([]); }
              else if (step === 'preview') setStep('mapping');
              else onClose();
            }}
            className="px-5 py-2 bg-slate-800 text-slate-300 rounded font-bold uppercase tracking-widest text-[11px] hover:bg-slate-700 transition"
          >
            {step === 'auth' ? 'Hủy' : 'Quay lại'}
          </button>

          <div className="flex gap-3">
            {step === 'mapping' && !loading && (
              <button
                onClick={proceedToPreview}
                disabled={!canProceed}
                className="px-5 py-2 bg-blue-600 text-white rounded font-bold uppercase tracking-widest text-[11px] hover:bg-blue-500 transition disabled:opacity-40 flex items-center gap-2"
              >
                Tiếp tục <ChevronRight size={14} />
              </button>
            )}
            {step === 'preview' && (
              <button
                onClick={confirmImport}
                disabled={selectedMembers.size === 0}
                className="px-5 py-2 bg-emerald-600 text-white rounded font-bold uppercase tracking-widest text-[11px] hover:bg-emerald-500 transition disabled:opacity-40"
              >
                Nhập {selectedMembers.size} thành viên
              </button>
            )}
            {step === 'done' && (
              <button
                onClick={onClose}
                className="px-5 py-2 bg-emerald-600 text-white rounded font-bold uppercase tracking-widest text-[11px] hover:bg-emerald-500 transition"
              >
                Đóng
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Sub-components ---

const MAX_RENDERED_ROLES = 50;

function useDebouncedValue<T>(value: T, delay = 150): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

interface RoleMappingRowProps {
  cls: ClassType;
  color: string;
  selectedRole: string;
  allRoles: string[];
  classRoleMap: Record<string, string>;
  onChange: (cls: ClassType, role: string) => void;
}

const RoleMappingRow: React.FC<RoleMappingRowProps> = ({
  cls, color, selectedRole, allRoles, classRoleMap, onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  const availableRoles = useMemo(() => {
    const used = new Set(Object.values(classRoleMap).filter(r => r));
    return allRoles.filter(r => !used.has(r) || r === selectedRole);
  }, [allRoles, classRoleMap, selectedRole]);

  const filtered = useMemo(() => {
    if (!debouncedSearch) return availableRoles;
    const query = debouncedSearch.toLowerCase();
    return availableRoles.filter(r => r.toLowerCase().includes(query));
  }, [availableRoles, debouncedSearch]);

  const visibleRoles = useMemo(() => filtered.slice(0, MAX_RENDERED_ROLES), [filtered]);
  const hiddenRoleCount = Math.max(0, filtered.length - visibleRoles.length);

  return (
    <div className="relative flex items-center gap-3 bg-slate-800/30 border border-slate-700/40 rounded-lg px-4 py-2.5">
      <div
        className="w-24 shrink-0 text-[11px] font-bold px-2 py-1 rounded text-center"
        style={{ backgroundColor: `${color}20`, border: `1px solid ${color}50`, color }}
      >
        {cls}
      </div>
      <span className="text-slate-600 shrink-0">→</span>
      <div className="relative flex-1 min-w-0">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex items-center justify-between px-3 py-1.5 rounded cursor-pointer select-none transition-all text-[12px]",
            selectedRole
              ? "bg-slate-700 border border-slate-600 text-slate-200"
              : "bg-slate-800 border border-slate-700 text-slate-500 hover:border-slate-600"
          )}
        >
          <span className={cn("truncate", !selectedRole && "italic")}>
            {selectedRole || '-- Chọn Discord Role --'}
          </span>
          <ChevronRight size={12} className={cn("shrink-0 transition-transform", isOpen && "rotate-90")} />
        </div>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl z-50 overflow-hidden">
            <div className="p-2 border-b border-slate-700">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Tìm role..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-[12px] text-slate-200 focus:outline-none focus:border-blue-500"
                  onClick={e => e.stopPropagation()}
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto custom-scrollbar">
              {filtered.length === 0 ? (
                <div className="px-3 py-3 text-[11px] text-slate-500 text-center italic">Không tìm thấy</div>
              ) : (
                <>
                  {visibleRoles.map(role => (
                    <div
                      key={role}
                      onClick={e => {
                        e.stopPropagation();
                        onChange(cls, role);
                        setIsOpen(false);
                        setSearch('');
                      }}
                      className={cn(
                        "px-3 py-2 text-[12px] cursor-pointer flex items-center justify-between transition-colors",
                        role === selectedRole
                          ? "bg-blue-500/20 text-blue-300"
                          : "text-slate-300 hover:bg-slate-700"
                      )}
                    >
                      <span>{role}</span>
                      {role === selectedRole && <CheckCircle size={12} className="text-blue-400 shrink-0" />}
                    </div>
                  ))}
                  {hiddenRoleCount > 0 && (
                    <div className="px-3 py-2 text-[11px] text-slate-500 text-center border-t border-slate-700 bg-slate-900/50">
                      Còn {hiddenRoleCount} role, hãy nhập từ khóa cụ thể hơn
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
      {selectedRole ? (
        <CheckCircle size={16} className="text-emerald-400 shrink-0" />
      ) : (
        <AlertCircle size={16} className="text-amber-400 shrink-0" />
      )}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => { setIsOpen(false); setSearch(''); }} />
      )}
    </div>
  );
};

interface SearchableSelectProps {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  onAdd: () => void;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ value, onChange, options, placeholder, onAdd }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  const filtered = useMemo(() => {
    if (!debouncedSearch) return options;
    const query = debouncedSearch.toLowerCase();
    return options.filter(r => r.toLowerCase().includes(query));
  }, [options, debouncedSearch]);

  const visibleOptions = useMemo(() => filtered.slice(0, MAX_RENDERED_ROLES), [filtered]);
  const hiddenOptionCount = Math.max(0, filtered.length - visibleOptions.length);

  return (
    <div className="relative flex gap-2">
      <div className="relative flex-1">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer text-[12px] text-slate-300 hover:border-slate-600 transition-colors"
        >
          <span className={cn(!value && "text-slate-500 italic")}>
            {value || placeholder}
          </span>
          <ChevronRight size={12} className={cn("shrink-0 transition-transform text-slate-500", isOpen && "rotate-90")} />
        </div>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl z-50 overflow-hidden">
            <div className="p-2 border-b border-slate-700">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Tìm role..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-[12px] text-slate-200 focus:outline-none focus:border-amber-500"
                  onClick={e => e.stopPropagation()}
                />
              </div>
            </div>
            <div className="max-h-40 overflow-y-auto custom-scrollbar">
              {filtered.length === 0 ? (
                <div className="px-3 py-3 text-[11px] text-slate-500 text-center italic">Không tìm thấy</div>
              ) : (
                <>
                  {visibleOptions.map(role => (
                    <div
                      key={role}
                      onClick={e => {
                        e.stopPropagation();
                        onChange(role);
                        setIsOpen(false);
                        setSearch('');
                      }}
                      className="px-3 py-2 text-[12px] text-slate-300 hover:bg-slate-700 cursor-pointer transition-colors"
                    >
                      {role}
                    </div>
                  ))}
                  {hiddenOptionCount > 0 && (
                    <div className="px-3 py-2 text-[11px] text-slate-500 text-center border-t border-slate-700 bg-slate-900/50">
                      Còn {hiddenOptionCount} role, hãy nhập từ khóa cụ thể hơn
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {isOpen && (
          <div className="fixed inset-0 z-40" onClick={() => { setIsOpen(false); setSearch(''); }} />
        )}
      </div>

      <button
        onClick={onAdd}
        disabled={!value}
        className="flex items-center gap-1.5 px-4 py-2 bg-amber-600/80 hover:bg-amber-500 text-white text-[11px] font-bold uppercase rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
      >
        <Plus size={12} /> Thêm
      </button>
    </div>
  );
};
