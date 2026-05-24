import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBattleDate } from './gvgParticipationService.js';

test('normalizes date input to UTC midnight', () => {
  const date = normalizeBattleDate('2026-05-30');
  assert.equal(date?.toISOString(), '2026-05-30T00:00:00.000Z');
});
