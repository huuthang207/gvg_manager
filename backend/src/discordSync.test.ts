import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFLICT_CLASS, resolveClassFromRoleMap, UNKNOWN_CLASS } from './discordSync.js';

test('resolveClassFromRoleMap returns the single matched class', () => {
  assert.equal(resolveClassFromRoleMap(['Bang Viên', 'Cửu Linh'], {
    'Toái Mộng': 'Toái Mộng',
    'Cửu Linh': 'Cửu Linh',
    'Long Ngâm': 'Long Ngâm',
  }), 'Cửu Linh');
});

test('resolveClassFromRoleMap returns unknown when no mapped class role matches', () => {
  assert.equal(resolveClassFromRoleMap(['Bang Viên'], {
    'Toái Mộng': 'Toái Mộng',
    'Cửu Linh': 'Cửu Linh',
  }), UNKNOWN_CLASS);
});

test('resolveClassFromRoleMap returns conflict when multiple mapped class roles match', () => {
  assert.equal(resolveClassFromRoleMap(['Bang Viên', 'Toái Mộng', 'Cửu Linh'], {
    'Toái Mộng': 'Toái Mộng',
    'Cửu Linh': 'Cửu Linh',
  }), CONFLICT_CLASS);
});

test('resolveClassFromRoleMap ignores blank mappings', () => {
  assert.equal(resolveClassFromRoleMap(['Bang Viên'], {
    'Toái Mộng': '',
    'Cửu Linh': '',
  }), UNKNOWN_CLASS);
});
