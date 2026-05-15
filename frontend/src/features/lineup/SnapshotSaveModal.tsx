/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LineupSnapshotSummary } from '../../services/discordApi.ts';

interface SnapshotSaveModalProps {
  open: boolean;
  snapshots: LineupSnapshotSummary[];
  snapshotName: string;
  saveMode: 'create' | 'overwrite';
  overwriteSnapshotId: string;
  saving: boolean;
  onClose: () => void;
  onSnapshotNameChange: (value: string) => void;
  onSaveModeChange: (mode: 'create' | 'overwrite') => void;
  onOverwriteSnapshotChange: (snapshotId: string) => void;
  onSave: () => Promise<void>;
}

export const SnapshotSaveModal: React.FC<SnapshotSaveModalProps> = ({
  open,
  snapshots,
  snapshotName,
  saveMode,
  overwriteSnapshotId,
  saving,
  onClose,
  onSnapshotNameChange,
  onSaveModeChange,
  onOverwriteSnapshotChange,
  onSave,
}) => {
  if (!open) return null;

  const selectedOverwriteSnapshot = snapshots.find(snapshot => snapshot.id === overwriteSnapshotId) || null;
  const isSaveDisabled = saving || !snapshotName.trim() || (saveMode === 'overwrite' && !overwriteSnapshotId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="app-surface w-full max-w-md rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white">Lưu đội hình</h2>
            <p className="mt-1 text-xs text-slate-400">Chọn tạo bản lưu mới hoặc ghi đè lên một bản lưu cũ.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            title="Đóng"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onSaveModeChange('create')}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${saveMode === 'create'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-slate-700 bg-slate-900/50 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Tạo bản lưu mới
            </button>
            <button
              onClick={() => onSaveModeChange('overwrite')}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${saveMode === 'overwrite'
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                : 'border-slate-700 bg-slate-900/50 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Ghi đè bản lưu cũ
            </button>
          </div>

          {saveMode === 'overwrite' && (
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Chọn đội hình cần ghi đè
              </label>
              <select
                value={overwriteSnapshotId}
                onChange={event => onOverwriteSnapshotChange(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 outline-none transition-colors focus:border-amber-500"
              >
                <option value="">Chọn đội hình đã lưu</option>
                {snapshots.map(snapshot => (
                  <option key={snapshot.id} value={snapshot.id}>
                    {snapshot.name}
                  </option>
                ))}
              </select>
              {selectedOverwriteSnapshot && (
                <p className="text-xs text-amber-300/90">
                  Đội hình hiện tại sẽ ghi đè lên: <span className="font-semibold">{selectedOverwriteSnapshot.name}</span>
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Tên đội hình
            </label>
            <input
              autoFocus
              type="text"
              value={snapshotName}
              onChange={event => onSnapshotNameChange(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && !isSaveDisabled) {
                  event.preventDefault();
                  void onSave();
                }
              }}
              placeholder="Ví dụ: Lineup công tối 13/05"
              className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 outline-none transition-colors focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="app-button-secondary rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Hủy
          </button>
          <button
            onClick={() => void onSave()}
            disabled={isSaveDisabled}
            className="rounded-lg border border-emerald-400/35 bg-emerald-500/14 px-4 py-2 text-sm font-semibold text-emerald-100 transition-colors hover:bg-emerald-500/22 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : saveMode === 'overwrite' ? 'Ghi đè' : 'Lưu mới'}
          </button>
        </div>
      </div>
    </div>
  );
};
