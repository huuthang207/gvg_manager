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
      nogo: 1,
      total: 3,
    });
  });

  it('renders grouped Discord attendance content', () => {
    const content = renderAttendancePublicContent(baseSession, votes);

    assert.match(content, /## Bang chiến tối nay/);
    assert.match(content, /🟢 \*\*Đang mở điểm danh\*\*/);
    assert.match(content, /🗳️ Tổng vote: 3/);
    assert.match(content, /✅ Tham gia: 2/);
    assert.match(content, /❌ Không tham gia: 1/);
    assert.doesNotMatch(content, /Theo phái/);
    assert.match(content, /Toái Mộng \(1\)\n1\. Nguoi Hai/);
    assert.match(content, /Tố Vấn \(1\)\n1\. Nguoi Mot/);
    assert.match(content, /1\. Nguoi Bon - Thiết Y/);
  });

  it('renders open sessions with no votes', () => {
    const content = renderAttendancePublicContent({ ...baseSession, headerText: '  ' }, []);

    assert.match(content, /## Điểm danh Bang Chiến/);
    assert.match(content, /🟢 \*\*Đang mở điểm danh\*\*/);
    assert.match(content, /🗳️ Tổng vote: 0/);
    assert.match(content, /✅ Tham gia: 0/);
    assert.match(content, /❌ Không tham gia: 0/);
    assert.doesNotMatch(content, /Theo phái/);
    assert.match(content, /Chưa có ai đăng ký\./);
  });

  it('renders empty lists and default header for closed sessions', () => {
    const content = renderAttendancePublicContent({ ...baseSession, headerText: null, status: 'CLOSED' }, []);

    assert.match(content, /## Điểm danh Bang Chiến/);
    assert.match(content, /🔒 \*\*Đã đóng điểm danh\*\*/);
    assert.doesNotMatch(content, /🟢 \*\*Đang mở điểm danh\*\*/);
    assert.match(content, /🗳️ Tổng vote: 0/);
    assert.doesNotMatch(content, /Theo phái/);
    assert.match(content, /Chưa có ai đăng ký\./);
    assert.match(content, /Chưa có ai chọn 'Không tham gia'\./);
  });

  it('uses member fallback data when vote snapshots are missing', () => {
    const content = renderAttendancePublicContent(baseSession, [
      {
        choice: 'GO',
        snapshotIngameName: null,
        snapshotClassType: null,
        updatedAt: new Date('2026-05-17T12:04:00.000Z'),
        member: {
          displayName: 'Discord Name',
          ingameName: 'Ingame Name',
          classType: 'Long Ngâm',
        },
      },
    ]);

    assert.match(content, /🗳️ Tổng vote: 1/);
    assert.doesNotMatch(content, /Theo phái/);
    assert.match(content, /Long Ngâm \(1\)\n1\. Ingame Name/);
  });

  it('uses current member identity when refresh rendering requests it', () => {
    const content = renderAttendancePublicContent(baseSession, [
      {
        choice: 'GO',
        snapshotIngameName: 'Tên cũ',
        snapshotClassType: 'Tố Vấn',
        updatedAt: new Date('2026-05-17T12:04:00.000Z'),
        member: {
          displayName: 'Discord Name',
          ingameName: 'Tên mới',
          classType: 'Huyết Hà',
        },
      },
      {
        choice: 'NOGO',
        snapshotIngameName: 'Tên cũ khác',
        snapshotClassType: 'Thiết Y',
        updatedAt: new Date('2026-05-17T12:05:00.000Z'),
        member: {
          displayName: 'Discord Name 2',
          ingameName: 'Tên mới khác',
          classType: 'Long Ngâm',
        },
      },
    ], { identitySource: 'live_member' });

    assert.match(content, /Huyết Hà \(1\)\n1\. Tên mới/);
    assert.match(content, /1\. Tên mới khác - Long Ngâm/);
    assert.doesNotMatch(content, /Tên cũ/);
    assert.doesNotMatch(content, /Tố Vấn \(1\)/);
    assert.doesNotMatch(content, /Thiết Y/);
  });

  it('keeps vote snapshots as the default identity source', () => {
    const content = renderAttendancePublicContent(baseSession, [
      {
        choice: 'GO',
        snapshotIngameName: 'Tên snapshot',
        snapshotClassType: 'Tố Vấn',
        updatedAt: new Date('2026-05-17T12:04:00.000Z'),
        member: {
          displayName: 'Discord Name',
          ingameName: 'Tên hiện tại',
          classType: 'Huyết Hà',
        },
      },
    ]);

    assert.match(content, /Tố Vấn \(1\)\n1\. Tên snapshot/);
    assert.doesNotMatch(content, /Tên hiện tại/);
    assert.doesNotMatch(content, /Huyết Hà/);
  });
});
