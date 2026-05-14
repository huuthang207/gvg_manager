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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="relative h-[88vh] w-full max-w-7xl">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          title="Đóng"
        >
          <X size={18} />
        </button>
        <SavedLineupsView {...viewProps} />
      </div>
    </div>
  );
};
