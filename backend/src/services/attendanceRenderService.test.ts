import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderAttendancePublicContent, summarizeAttendanceRenderVotes } from './attendanceRenderService.js';

const baseSession = {
  headerText: 'Bang chiến tối nay',
  status: 'OPEN' as const,
  lastRenderedAt: null,
  lastVoteAt: null,
  updatedAt: new Date('2026-05-17T12:00:00.000Z'),
};

const votes = [
  {
    choice: 'GO' as const,
    snapshotIngameName: 'Nguoi Mot',
    snapshotClassType: 'Tố Vấn',
    updatedAt: new Date('2026-05-17T12:01:00.000Z'),
  },
  {
    choice: 'GO' as const,
    snapshotIngameName: 'Nguoi Hai',
    snapshotClassType: 'Toái Mộng',
    updatedAt: new Date('2026-05-17T12:00:00.000Z'),
  },
  {
    choice: 'MAYBE' as const,
    snapshotIngameName: 'Nguoi Ba',
    snapshotClassType: 'Huyết Hà',
    updatedAt: new Date('2026-05-17T12:02:00.000Z'),
  },
  {
    choice: 'NOGO' as const,
    snapshotIngameName: 'Nguoi Bon',
    snapshotClassType: 'Thiết Y',
    updatedAt: new Date('2026-05-17T12:03:00.000Z'),
  },
];

describe('attendanceRenderService', () => {
  it('summarizes vote choices', () => {
    assert.deepEqual(summarizeAttendanceRenderVotes(votes), {
      go: 2,
      maybe: 1,
      nogo: 1,
      total: 4,
    });
  });

  it('renders grouped Discord attendance content', () => {
    const content = renderAttendancePublicContent(baseSession, votes);

    assert.match(content, /## Bang chiến tối nay/);
    assert.match(content, /🟢 \*\*Đang mở điểm danh\*\*/);
    assert.match(content, /Tổng vote: 4/);
    assert.match(content, /✅ Tham gia: 2/);
    assert.match(content, /❔ Dự bị: 1/);
    assert.match(content, /❌ Không tham gia: 1/);
    assert.match(content, /⚔️ Theo phái: Toái Mộng:1 \| Huyết Hà:1 \| Thiết Y:1 \| Tố Vấn:1/);
    assert.match(content, /Toái Mộng \(1\)\n1\. Nguoi Hai/);
    assert.match(content, /Tố Vấn \(1\)\n1\. Nguoi Mot/);
    assert.match(content, /1\. Nguoi Ba - Huyết Hà/);
    assert.match(content, /1\. Nguoi Bon - Thiết Y/);
  });

  it('renders empty lists and default header for closed sessions', () => {
    const content = renderAttendancePublicContent({ ...baseSession, headerText: null, status: 'CLOSED' }, []);

    assert.match(content, /## Điểm danh Bang Chiến/);
    assert.match(content, /🔒 \*\*Đã đóng điểm danh\*\*/);
    assert.match(content, /Tổng vote: 0/);
    assert.match(content, /Theo phái: \(chưa có\)/);
    assert.match(content, /Chưa có ai đăng ký\./);
    assert.match(content, /Chưa có ai chọn 'Dự bị'\./);
    assert.match(content, /Chưa có ai chọn 'Không tham gia'\./);
  });
});
