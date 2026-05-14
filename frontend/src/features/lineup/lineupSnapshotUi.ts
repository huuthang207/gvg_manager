/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RecentSnapshotAction {
  snapshotId: string;
  type: 'created' | 'overwritten';
}

interface SnapshotBadge {
  label: string;
  className: string;
}

interface SnapshotActionChip {
  text: string;
  className: string;
}

interface SnapshotActionPanel {
  title: string;
  description: string;
  style: {
    borderColor: string;
    background: string;
  };
}

export interface SnapshotActionContent {
  chip: SnapshotActionChip;
  panel: SnapshotActionPanel;
}

function getActionChip(type: RecentSnapshotAction['type']): SnapshotActionChip {
  return type === 'created'
    ? {
        text: 'Vừa tạo mới',
        className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
      }
    : {
        text: 'Vừa ghi đè',
        className: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
      };
}

function getActionPanel(type: RecentSnapshotAction['type']): SnapshotActionPanel {
  return type === 'created'
    ? {
        title: 'Snapshot này vừa được tạo mới.',
        description: 'Bạn có thể kiểm tra lại nội dung hoặc khôi phục bất kỳ lúc nào.',
        style: {
          borderColor: 'rgba(16,185,129,0.28)',
          background: 'rgba(16,185,129,0.08)',
        },
      }
    : {
        title: 'Snapshot này vừa được ghi đè bằng đội hình hiện tại.',
        description: 'Nội dung cũ đã được thay bằng trạng thái đội hình mới nhất.',
        style: {
          borderColor: 'rgba(245,158,11,0.28)',
          background: 'rgba(245,158,11,0.08)',
        },
      };
}

export function getSnapshotBadge(recentSnapshotAction?: RecentSnapshotAction | null, snapshotId?: string, isNewest = false): SnapshotBadge | null {
  if (recentSnapshotAction?.snapshotId === snapshotId) {
    return recentSnapshotAction.type === 'created'
      ? { label: 'Mới', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' }
      : { label: 'Đã ghi đè', className: 'border-amber-500/30 bg-amber-500/10 text-amber-300' };
  }

  if (isNewest) {
    return { label: 'Lastest', className: 'border-sky-500/30 bg-sky-500/10 text-sky-300' };
  }

  return null;
}

export function getSnapshotActionContent(recentSnapshotAction?: RecentSnapshotAction | null, selectedSnapshotId?: string | null): SnapshotActionContent | null {
  if (!recentSnapshotAction || !selectedSnapshotId || recentSnapshotAction.snapshotId !== selectedSnapshotId) return null;
  return {
    chip: getActionChip(recentSnapshotAction.type),
    panel: getActionPanel(recentSnapshotAction.type),
  };
}
