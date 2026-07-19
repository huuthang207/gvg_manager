import test from 'node:test';
import assert from 'node:assert/strict';
import { getPermissionsForRole, hasPermission } from './permissions.js';

test('owners and managers retain attendance administration without lineup permissions', () => {
  assert.equal(hasPermission('owner', 'manage:attendance'), true);
  assert.equal(hasPermission('manager', 'manage:attendance'), true);
  assert.equal(hasPermission('member', 'manage:attendance'), false);
  assert.deepEqual(getPermissionsForRole('manager'), ['view:guild', 'manage:attendance', 'manage:members']);
});
