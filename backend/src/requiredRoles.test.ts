import test from 'node:test';
import assert from 'node:assert/strict';
import { hasRequiredRole } from './requiredRoles.js';

test('hasRequiredRole allows every member when no required roles are configured', () => {
  assert.equal(hasRequiredRole([], []), true);
});

test('hasRequiredRole allows a member with any configured role', () => {
  assert.equal(hasRequiredRole(['Bang Viên'], ['Bang Viên', 'Scrim']), true);
  assert.equal(hasRequiredRole(['Scrim'], ['Bang Viên', 'Scrim']), true);
  assert.equal(hasRequiredRole(['Bang Viên', 'Scrim'], ['Bang Viên', 'Scrim']), true);
});

test('hasRequiredRole blocks a member without configured roles', () => {
  assert.equal(hasRequiredRole(['Khách'], ['Bang Viên', 'Scrim']), false);
});
