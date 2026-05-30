import test from 'node:test';
import assert from 'node:assert/strict';
import { createLineupCollisionDetection } from './skillCollisionDetection.ts';

test('skill drags prefer the droppable under the pointer over closest center', () => {
  const calls: string[] = [];
  const collisionDetection = createLineupCollisionDetection({
    pointerWithin: () => {
      calls.push('pointerWithin');
      return [{ id: 'skill-pool' } as never];
    },
    closestCenter: () => {
      calls.push('closestCenter');
      return [{ id: 'droppable-member-team-1' } as never];
    },
  });

  const collisions = collisionDetection({
    active: {
      data: {
        current: {
          type: 'skill',
        },
      },
    },
  } as never);

  assert.deepEqual(calls, ['pointerWithin']);
  assert.equal(collisions[0]?.id, 'skill-pool');
});

test('skill drags fall back to closest center when pointer is not over a droppable', () => {
  const calls: string[] = [];
  const collisionDetection = createLineupCollisionDetection({
    pointerWithin: () => {
      calls.push('pointerWithin');
      return [];
    },
    closestCenter: () => {
      calls.push('closestCenter');
      return [{ id: 'droppable-member-team-1' } as never];
    },
  });

  const collisions = collisionDetection({
    active: {
      data: {
        current: {
          type: 'skill',
        },
      },
    },
  } as never);

  assert.deepEqual(calls, ['pointerWithin', 'closestCenter']);
  assert.equal(collisions[0]?.id, 'droppable-member-team-1');
});

test('member drags keep using closest center', () => {
  const calls: string[] = [];
  const collisionDetection = createLineupCollisionDetection({
    pointerWithin: () => {
      calls.push('pointerWithin');
      return [{ id: 'skill-pool' } as never];
    },
    closestCenter: () => {
      calls.push('closestCenter');
      return [{ id: 'team-1-slot-0' } as never];
    },
  });

  const collisions = collisionDetection({
    active: {
      data: {
        current: {
          type: 'member',
        },
      },
    },
  } as never);

  assert.deepEqual(calls, ['closestCenter']);
  assert.equal(collisions[0]?.id, 'team-1-slot-0');
});
