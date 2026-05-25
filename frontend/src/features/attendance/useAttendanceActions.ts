import React from 'react';
import type { AppStateResponse } from '../../services/apiTypes.ts';
import {
  closeActiveAttendanceSession,
  deleteGvgParticipationSessionsForMonth,
  openAttendanceSession,
  refreshActiveAttendanceSession,
  updateAttendanceChannel,
} from '../../services/discordApi.ts';
import { getErrorMessage } from '../../lib/error.ts';

interface UseAttendanceActionsParams {
  applyAppState: (state: AppStateResponse) => Promise<void>;
  refreshGvgParticipationStats: () => Promise<void>;
  setAttendanceActionLoading: React.Dispatch<React.SetStateAction<boolean>>;
  alert: (options: { message: string; variant?: 'info' | 'success' | 'warning' | 'error' }) => Promise<void>;
  confirm: (options: { message: string; variant?: 'info' | 'success' | 'warning' | 'danger'; confirmLabel?: string }) => Promise<boolean>;
}

export function useAttendanceActions({
  applyAppState,
  refreshGvgParticipationStats,
  setAttendanceActionLoading,
  alert,
  confirm,
}: UseAttendanceActionsParams) {
  const runAttendanceAction = React.useCallback(async (action: () => Promise<AppStateResponse>, fallbackMessage: string) => {
    setAttendanceActionLoading(true);
    try {
      const state = await action();
      await applyAppState(state);
    } catch (err) {
      void alert({ message: getErrorMessage(err, fallbackMessage), variant: 'error' });
    } finally {
      setAttendanceActionLoading(false);
    }
  }, [alert, applyAppState, setAttendanceActionLoading]);

  const handleSetAttendanceChannel = React.useCallback((discordChannelId: string) => {
    void runAttendanceAction(
      () => updateAttendanceChannel(discordChannelId.trim()),
      'Không thể lưu kênh điểm danh',
    );
  }, [runAttendanceAction]);

  const handleOpenAttendanceSession = React.useCallback((headerText: string) => {
    void runAttendanceAction(
      () => openAttendanceSession(headerText.trim()),
      'Không thể mở phiên điểm danh',
    );
  }, [runAttendanceAction]);

  const handleCloseAttendanceSession = React.useCallback(async () => {
    const confirmed = await confirm({
      message: 'Bạn có chắc muốn đóng phiên điểm danh hiện tại?',
      variant: 'danger',
      confirmLabel: 'Đóng phiên',
    });
    if (!confirmed) return;

    void runAttendanceAction(
      closeActiveAttendanceSession,
      'Không thể đóng phiên điểm danh',
    );
  }, [confirm, runAttendanceAction]);

  const handleRefreshAttendanceSession = React.useCallback(() => {
    void runAttendanceAction(
      refreshActiveAttendanceSession,
      'Không thể refresh phiên điểm danh',
    );
  }, [runAttendanceAction]);

  const handleDeleteGvgParticipationMonth = React.useCallback(async (month: string) => {
    try {
      const state = await deleteGvgParticipationSessionsForMonth(month);
      await applyAppState(state);
      await refreshGvgParticipationStats();
      return state.gvgParticipationDeletedCount;
    } catch (err) {
      void alert({ message: getErrorMessage(err, 'Không thể xoá dữ liệu bang chiến tháng này'), variant: 'error' });
      throw err;
    }
  }, [alert, applyAppState, refreshGvgParticipationStats]);

  return {
    handleSetAttendanceChannel,
    handleOpenAttendanceSession,
    handleCloseAttendanceSession,
    handleRefreshAttendanceSession,
    handleDeleteGvgParticipationMonth,
  };
}
