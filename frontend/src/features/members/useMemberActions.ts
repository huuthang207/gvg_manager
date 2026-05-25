import React from 'react';
import type { ClassType, Member, Skill } from '../../types.ts';
import type { AppStateResponse } from '../../services/apiTypes.ts';
import {
  acknowledgeClassChange,
  assignMemberSkill,
  deleteMember,
  removeMemberSkill,
  resetCurrentGuildData,
  syncDiscordMembers,
  updateAccessRoles,
  updateMemberClassRole,
  updateMemberIngameName,
  updateMyIngameName,
  updateRoleConfig,
} from '../../services/discordApi.ts';
import { getErrorMessage } from '../../lib/error.ts';

interface UseMemberActionsParams {
  applyAppState: (state: AppStateResponse) => Promise<void>;
  loadAppState: () => Promise<AppStateResponse>;
  setMemberPool: React.Dispatch<React.SetStateAction<Member[]>>;
  setSkills: React.Dispatch<React.SetStateAction<Skill[]>>;
  setSyncing: React.Dispatch<React.SetStateAction<boolean>>;
  resetSnapshots: () => void;
  updateActiveTab: (tab: 'dashboard' | 'teams' | 'attendance') => void;
  alert: (options: { message: string; variant?: 'info' | 'success' | 'warning' | 'error' }) => Promise<void>;
}

export function useMemberActions({
  applyAppState,
  loadAppState,
  setMemberPool,
  setSkills,
  setSyncing,
  resetSnapshots,
  updateActiveTab,
  alert,
}: UseMemberActionsParams) {
  const handleAssignSkillToMember = React.useCallback((memberId: string, skill: Skill) => {
    setMemberPool(prev => prev.map(m => {
      if (m.id === memberId) {
        const assignedSkills = m.assignedSkills || [];
        if (assignedSkills.includes(skill.id)) return m;
        return {
          ...m,
          assignedSkills: [...assignedSkills, skill.id],
        };
      }
      return m;
    }));
    void assignMemberSkill(memberId, skill).then(applyAppState).catch(err => {
      void alert({ message: getErrorMessage(err, 'Không thể lưu kỹ năng cho thành viên'), variant: 'error' });
      void loadAppState();
    });
  }, [alert, applyAppState, loadAppState, setMemberPool]);

  const handleRemoveSkillFromMember = React.useCallback((memberId: string, skillId: string) => {
    setMemberPool(prev => prev.map(m => {
      if (m.id === memberId) {
        return {
          ...m,
          assignedSkills: (m.assignedSkills || []).filter(id => id !== skillId),
        };
      }
      return m;
    }));
    void removeMemberSkill(memberId, skillId).then(applyAppState).catch(err => {
      void alert({ message: getErrorMessage(err, 'Không thể gỡ kỹ năng khỏi thành viên'), variant: 'error' });
      void loadAppState();
    });
  }, [alert, applyAppState, loadAppState, setMemberPool]);

  const handleAddSkills = React.useCallback((skillsData: Omit<Skill, 'id'>[]) => {
    const newSkills = skillsData.map(data => ({
      ...data,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
    }));
    setSkills(prev => [...prev, ...newSkills]);
  }, [setSkills]);

  const handleDeleteSkill = React.useCallback((id: string) => {
    setSkills(prev => prev.filter(s => s.id !== id));
    setMemberPool(prev => prev.map(m => ({
      ...m,
      assignedSkills: (m.assignedSkills || []).filter(sid => sid !== id),
    })));
  }, [setMemberPool, setSkills]);

  const handleDeleteMember = React.useCallback(async (memberId: string) => {
    try {
      const state = await deleteMember(memberId);
      await applyAppState(state);
    } catch (err) {
      void alert({ message: getErrorMessage(err, 'Không thể gỡ role Bang Viên khỏi thành viên'), variant: 'error' });
      throw err;
    }
  }, [alert, applyAppState]);

  const handleSyncDiscord = React.useCallback(async () => {
    setSyncing(true);
    try {
      const state = await syncDiscordMembers();
      await applyAppState(state);
    } catch (err) {
      void alert({ message: getErrorMessage(err, 'Không thể đồng bộ Discord'), variant: 'error' });
    } finally {
      setSyncing(false);
    }
  }, [alert, applyAppState, setSyncing]);

  const handleAcknowledgeClassChange = React.useCallback(async (memberId: string) => {
    try {
      const state = await acknowledgeClassChange(memberId);
      await applyAppState(state);
    } catch (err) {
      void alert({ message: getErrorMessage(err, 'Không thể cập nhật trạng thái đổi phái'), variant: 'error' });
    }
  }, [alert, applyAppState]);

  const handleUpdateIngameName = React.useCallback(async (memberId: string, ingameName: string) => {
    try {
      const state = await updateMemberIngameName(memberId, ingameName);
      await applyAppState(state);
    } catch (err) {
      void alert({ message: getErrorMessage(err, 'Không thể cập nhật tên ingame'), variant: 'error' });
      throw err;
    }
  }, [alert, applyAppState]);

  const handleUpdateMemberClassRole = React.useCallback(async (memberId: string, classType: ClassType) => {
    try {
      const state = await updateMemberClassRole(memberId, classType);
      await applyAppState(state);
    } catch (err) {
      void alert({ message: getErrorMessage(err, 'Không thể cập nhật role môn phái'), variant: 'error' });
      throw err;
    }
  }, [alert, applyAppState]);

  const handleUpdateMyIngameName = React.useCallback(async (ingameName: string) => {
    try {
      const state = await updateMyIngameName(ingameName);
      await applyAppState(state);
    } catch (err) {
      void alert({ message: getErrorMessage(err, 'Không thể cập nhật tên ingame'), variant: 'error' });
      throw err;
    }
  }, [alert, applyAppState]);

  const handleResetCurrentGuildData = React.useCallback(async (confirmation: string) => {
    try {
      const state = await resetCurrentGuildData(confirmation);
      resetSnapshots();
      await applyAppState(state);
      updateActiveTab('dashboard');
    } catch (err) {
      void alert({ message: getErrorMessage(err, 'Không thể reset dữ liệu server'), variant: 'error' });
      throw err;
    }
  }, [alert, applyAppState, resetSnapshots, updateActiveTab]);

  const handleUpdateRoleConfig = React.useCallback(async (classRoleMap: Record<string, string>, requiredRoles: string[], accessRoles?: { managerRoles: string[]; memberRoles: string[] }) => {
    try {
      let state = await updateRoleConfig(classRoleMap, requiredRoles);
      if (accessRoles) {
        state = await updateAccessRoles(accessRoles.managerRoles, accessRoles.memberRoles);
      }
      await applyAppState(state);
    } catch (err) {
      void alert({ message: getErrorMessage(err, 'Không thể cập nhật cấu hình role'), variant: 'error' });
      throw err;
    }
  }, [alert, applyAppState]);

  return {
    handleAssignSkillToMember,
    handleRemoveSkillFromMember,
    handleAddSkills,
    handleDeleteSkill,
    handleDeleteMember,
    handleSyncDiscord,
    handleAcknowledgeClassChange,
    handleUpdateIngameName,
    handleUpdateMemberClassRole,
    handleUpdateMyIngameName,
    handleResetCurrentGuildData,
    handleUpdateRoleConfig,
  };
}
