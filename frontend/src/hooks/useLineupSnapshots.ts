import React from 'react';
import {
  LineupSnapshotDetail,
  LineupSnapshotSummary,
  createLineupSnapshot,
  updateLineupSnapshot,
  getLineupSnapshot,
  getLineupSnapshots,
  restoreLineupSnapshot,
  deleteLineupSnapshot,
  getAppState,
} from '../services/discordApi.ts';
import { getErrorMessage } from '../lib/error.ts';
import { useSystemDialog } from '../features/app/SystemDialogProvider.tsx';

interface UseLineupSnapshotsOptions {
  applyAppState: (state: Awaited<ReturnType<typeof getAppState>>) => Promise<void>;
}

export interface LineupSnapshotState {
  snapshots: LineupSnapshotSummary[];
  snapshotsOpen: boolean;
  snapshotsLoading: boolean;
  snapshotDetailLoading: boolean;
  snapshotActionLoading: boolean;
  selectedSnapshotId: string | null;
  pendingSnapshotId: string | null;
  selectedSnapshot: LineupSnapshotDetail | null;
  recentSnapshotAction: { snapshotId: string; type: 'created' | 'overwritten' } | null;
}

export interface LineupSnapshotActions {
  openSnapshots: () => Promise<void>;
  closeSnapshots: () => void;
  selectSnapshot: (snapshotId: string) => Promise<void>;
  saveSnapshot: (mode: 'create' | 'overwrite', name: string, snapshotId?: string | null) => Promise<void>;
  restoreSnapshot: (snapshotId: string) => Promise<void>;
  removeSnapshot: (snapshotId: string) => Promise<void>;
  resetSnapshots: () => void;
  refreshSnapshots: () => Promise<void>;
}

export function useLineupSnapshots({ applyAppState }: UseLineupSnapshotsOptions) {
  const { alert, confirm } = useSystemDialog();
  const [snapshots, setSnapshots] = React.useState<LineupSnapshotSummary[]>([]);
  const [snapshotsOpen, setSnapshotsOpen] = React.useState(false);
  const [snapshotsLoading, setSnapshotsLoading] = React.useState(false);
  const [snapshotDetailLoading, setSnapshotDetailLoading] = React.useState(false);
  const [snapshotActionLoading, setSnapshotActionLoading] = React.useState(false);
  const [selectedSnapshotId, setSelectedSnapshotId] = React.useState<string | null>(null);
  const [pendingSnapshotId, setPendingSnapshotId] = React.useState<string | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = React.useState<LineupSnapshotDetail | null>(null);
  const [recentSnapshotAction, setRecentSnapshotAction] = React.useState<{ snapshotId: string; type: 'created' | 'overwritten' } | null>(null);

  const loadSnapshots = React.useCallback(async (preferredSnapshotId?: string | null) => {
    setSnapshotsLoading(true);
    try {
      const items = await getLineupSnapshots();
      setSnapshots(items);

      const nextSelectedId = preferredSnapshotId && items.some(item => item.id === preferredSnapshotId)
        ? preferredSnapshotId
        : items[0]?.id ?? null;
      setSelectedSnapshotId(nextSelectedId);
      setPendingSnapshotId(null);

      if (!nextSelectedId) {
        setSelectedSnapshot(null);
        return;
      }

      setSnapshotDetailLoading(true);
      try {
        const detail = await getLineupSnapshot(nextSelectedId);
        setSelectedSnapshot(detail);
      } finally {
        setSnapshotDetailLoading(false);
      }
    } finally {
      setSnapshotsLoading(false);
    }
  }, []);

  const openSnapshots = React.useCallback(async () => {
    setSnapshotsOpen(true);
    try {
      await loadSnapshots(selectedSnapshotId);
    } catch (err) {
      void alert({ message: getErrorMessage(err, 'Không thể tải đội hình đã lưu'), variant: 'error' });
    }
  }, [alert, loadSnapshots, selectedSnapshotId]);

  const closeSnapshots = React.useCallback(() => {
    setSnapshotsOpen(false);
  }, []);

  const selectSnapshot = React.useCallback(async (snapshotId: string) => {
    if (snapshotId === selectedSnapshotId && selectedSnapshot?.id === snapshotId) return;
    setPendingSnapshotId(snapshotId);
    setSnapshotDetailLoading(true);
    try {
      const detail = await getLineupSnapshot(snapshotId);
      setSelectedSnapshot(detail);
      setSelectedSnapshotId(snapshotId);
    } catch (err) {
      void alert({ message: getErrorMessage(err, 'Không thể tải chi tiết đội hình'), variant: 'error' });
    } finally {
      setPendingSnapshotId(null);
      setSnapshotDetailLoading(false);
    }
  }, [alert, selectedSnapshotId, selectedSnapshot?.id]);

  const saveSnapshot = React.useCallback(async (
    mode: 'create' | 'overwrite',
    name: string,
    snapshotId?: string | null,
  ) => {
    try {
      const detail = mode === 'overwrite'
        ? await updateLineupSnapshot(snapshotId || '', name)
        : await createLineupSnapshot(name);
      setRecentSnapshotAction({
        snapshotId: detail.id,
        type: mode === 'overwrite' ? 'overwritten' : 'created',
      });
      await loadSnapshots(detail.id);
    } catch (err) {
      void alert({ message: getErrorMessage(err, 'Không thể lưu đội hình'), variant: 'error' });
      throw err;
    }
  }, [alert, loadSnapshots]);

  const restoreSnapshot = React.useCallback(async (snapshotId: string) => {
    const confirmed = await confirm({
      message: 'Khôi phục đội hình này sẽ ghi đè đội hình hiện tại. Bạn có chắc không?',
      variant: 'warning',
      confirmLabel: 'Khôi phục',
    });
    if (!confirmed) return;

    setSnapshotActionLoading(true);
    try {
      const state = await restoreLineupSnapshot(snapshotId);
      await applyAppState(state);
      setSnapshotsOpen(false);
      void alert({ message: 'Đã khôi phục đội hình thành công.', variant: 'success' });
    } catch (err) {
      void alert({ message: getErrorMessage(err, 'Không thể khôi phục đội hình'), variant: 'error' });
    } finally {
      setSnapshotActionLoading(false);
    }
  }, [alert, applyAppState, confirm]);

  const removeSnapshot = React.useCallback(async (snapshotId: string) => {
    const confirmed = await confirm({
      message: 'Bạn có chắc muốn xóa đội hình đã lưu này?',
      variant: 'danger',
      confirmLabel: 'Xóa',
    });
    if (!confirmed) return;

    setSnapshotActionLoading(true);
    try {
      await deleteLineupSnapshot(snapshotId);
      const nextSelectedId = selectedSnapshotId === snapshotId ? null : selectedSnapshotId;
      await loadSnapshots(nextSelectedId);
    } catch (err) {
      void alert({ message: getErrorMessage(err, 'Không thể xóa đội hình đã lưu'), variant: 'error' });
    } finally {
      setSnapshotActionLoading(false);
    }
  }, [alert, confirm, loadSnapshots, selectedSnapshotId]);

  const resetSnapshots = React.useCallback(() => {
    setSnapshots([]);
    setSelectedSnapshot(null);
    setSelectedSnapshotId(null);
    setPendingSnapshotId(null);
    setRecentSnapshotAction(null);
    setSnapshotsOpen(false);
    setSnapshotsLoading(false);
    setSnapshotDetailLoading(false);
    setSnapshotActionLoading(false);
  }, []);

  const refreshSnapshots = React.useCallback(async () => {
    await loadSnapshots(selectedSnapshotId);
  }, [loadSnapshots, selectedSnapshotId]);

  const snapshotState: LineupSnapshotState = {
    snapshots,
    snapshotsOpen,
    snapshotsLoading,
    snapshotDetailLoading,
    snapshotActionLoading,
    selectedSnapshotId,
    pendingSnapshotId,
    selectedSnapshot,
    recentSnapshotAction,
  };

  const snapshotActions: LineupSnapshotActions = {
    openSnapshots,
    closeSnapshots,
    selectSnapshot,
    saveSnapshot,
    restoreSnapshot,
    removeSnapshot,
    resetSnapshots,
    refreshSnapshots,
  };

  return {
    ...snapshotState,
    ...snapshotActions,
    snapshotState,
    snapshotActions,
  };
}
