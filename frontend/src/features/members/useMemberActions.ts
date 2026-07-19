import React from 'react';
import type { AppStateResponse } from '../../services/apiTypes.ts';
import {
  deleteMember,
  resetCurrentGuildData,
  updateAccessRoles,
  updateMemberClassRole,
  updateMemberIngameName,
  updateMyIngameName,
  updateRoleConfig,
} from '../../services/discordApi.ts';
import type { ClassType } from '../../types.ts';
import { getErrorMessage } from '../../lib/error.ts';

interface UseMemberActionsParams {
  applyAppState: (state: AppStateResponse) => Promise<void>;
  loadAppState: () => Promise<AppStateResponse>;
  setSyncing: React.Dispatch<React.SetStateAction<boolean>>;
  updateActiveTab: (tab: 'dashboard' | 'attendance') => void;
  alert: (options: { message: string; variant?: 'info' | 'success' | 'warning' | 'error' }) => Promise<void>;
}

export function useMemberActions({ applyAppState, loadAppState, setSyncing, updateActiveTab, alert }: UseMemberActionsParams) {
  const handleDeleteMember = React.useCallback(async (memberId: string) => {
    try {
      await applyAppState(await deleteMember(memberId));
    } catch (err) {
      void alert({ message: getErrorMessage(err, 'Không thể gỡ role Bang Viên khỏi thành viên'), variant: 'error' });
      throw err;
    }
  }, [alert, applyAppState]);

  const handleUpdateIngameName = React.useCallback(async (memberId: string, ingameName: string) => {
    try {
      await applyAppState(await updateMemberIngameName(memberId, ingameName));
    } catch (err) {
      void alert({ message: getErrorMessage(err, 'Không thể cập nhật tên ingame'), variant: 'error' });
      throw err;
    }
  }, [alert, applyAppState]);

  const handleUpdateMemberClassRole = React.useCallback(async (memberId: string, classType: ClassType) => {
    try {
      await applyAppState(await updateMemberClassRole(memberId, classType));
    } catch (err) {
      void alert({ message: getErrorMessage(err, 'Không thể cập nhật role môn phái'), variant: 'error' });
      throw err;
    }
  }, [alert, applyAppState]);

  const handleUpdateMyIngameName = React.useCallback(async (ingameName: string) => {
    try {
      await applyAppState(await updateMyIngameName(ingameName));
    } catch (err) {
      void alert({ message: getErrorMessage(err, 'Không thể cập nhật tên ingame'), variant: 'error' });
      throw err;
    }
  }, [alert, applyAppState]);

  const handleResetCurrentGuildData = React.useCallback(async (confirmation: string) => {
    try {
      await applyAppState(await resetCurrentGuildData(confirmation));
      updateActiveTab('dashboard');
    } catch (err) {
      void alert({ message: getErrorMessage(err, 'Không thể reset dữ liệu server'), variant: 'error' });
      throw err;
    }
  }, [alert, applyAppState, updateActiveTab]);

  const handleUpdateRoleConfig = React.useCallback(async (classRoleMap: Record<string, string>, requiredRoles: string[], accessRoles?: { managerRoles: string[]; memberRoles: string[] }) => {
    try {
      let state = await updateRoleConfig(classRoleMap, requiredRoles);
      if (accessRoles) state = await updateAccessRoles(accessRoles.managerRoles, accessRoles.memberRoles);
      await applyAppState(state);
    } catch (err) {
      void alert({ message: getErrorMessage(err, 'Không thể cập nhật cấu hình role'), variant: 'error' });
      throw err;
    }
  }, [alert, applyAppState]);

  void loadAppState;
  void setSyncing;
  return { handleDeleteMember, handleUpdateIngameName, handleUpdateMemberClassRole, handleUpdateMyIngameName, handleResetCurrentGuildData, handleUpdateRoleConfig };
}
