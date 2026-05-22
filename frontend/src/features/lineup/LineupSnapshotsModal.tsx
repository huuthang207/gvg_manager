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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-md md:p-6"
      onClick={onClose}
    >
      <div
        className="relative h-[90vh] w-full max-w-[1500px] overflow-hidden rounded-[28px] border border-slate-700/70 bg-slate-950/95 shadow-2xl shadow-slate-950/70"
        onClick={event => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 rounded-xl border border-slate-700/80 bg-slate-900/90 p-2 text-slate-400 shadow-lg shadow-slate-950/30 transition-colors hover:border-slate-500 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
          title="Đóng"
        >
          <X size={18} />
        </button>
        <SavedLineupsView {...viewProps} variant="modal" />
      </div>
    </div>
  );
};
