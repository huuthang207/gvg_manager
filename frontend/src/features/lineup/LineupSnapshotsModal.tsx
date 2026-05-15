/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LineupSnapshotDetail, LineupSnapshotSummary } from '../../services/discordApi.ts';
import { Member, Skill } from '../../types.ts';
import { X } from 'lucide-react';
import { RecentSnapshotAction } from './lineupSnapshotUi.ts';
import { SavedLineupsView } from './SavedLineupsView.tsx';

interface LineupSnapshotsModalProps {
  snapshots: LineupSnapshotSummary[];
  selectedSnapshotId: string | null;
  selectedSnapshot: LineupSnapshotDetail | null;
  loading: boolean;
  detailLoading: boolean;
  actionLoading: boolean;
  canRestoreSnapshot: boolean;
  canDeleteSnapshot: boolean;
  recentSnapshotAction?: RecentSnapshotAction | null;
  skills: Skill[];
  getMemberById: (id: string) => Member | null;
  onClose: () => void;
  onSelectSnapshot: (snapshotId: string) => void;
  onRestoreSnapshot: (snapshotId: string) => void;
  onDeleteSnapshot: (snapshotId: string) => void;
}

export const LineupSnapshotsModal: React.FC<LineupSnapshotsModalProps> = ({
  onClose,
  ...viewProps
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-lg border border-slate-700 bg-slate-900/90 p-2 text-slate-400 shadow-lg transition-colors hover:bg-slate-800 hover:text-white"
        title="Đóng"
      >
        <X size={18} />
      </button>
      <div className="h-[88vh] w-full max-w-7xl" onClick={event => event.stopPropagation()}>
        <SavedLineupsView {...viewProps} />
      </div>
    </div>
  );
};
