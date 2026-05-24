import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBattleDate, parseGvgParticipationStatsMonth } from './gvgParticipationService.js';

test('normalizes date input to UTC midnight', () => {
  const date = normalizeBattleDate('2026-05-30');
  assert.equal(date?.toISOString(), '2026-05-30T00:00:00.000Z');
});

test('parses GvG participation stats month to UTC range', () => {
  const range = parseGvgParticipationStatsMonth('2026-05');
  assert.equal(range?.month, '2026-05');
  assert.equal(range?.start.toISOString(), '2026-05-01T00:00:00.000Z');
  assert.equal(range?.end.toISOString(), '2026-06-01T00:00:00.000Z');
});

test('rejects invalid GvG participation stats months', () => {
  assert.equal(parseGvgParticipationStatsMonth('2026-00'), null);
  assert.equal(parseGvgParticipationStatsMonth('2026-13'), null);
  assert.equal(parseGvgParticipationStatsMonth('2026-5'), null);
  assert.equal(parseGvgParticipationStatsMonth('invalid'), null);
});
