import { closestCenter, pointerWithin, type CollisionDetection } from '@dnd-kit/core';

type CollisionDetectors = {
  pointerWithin: CollisionDetection;
  closestCenter: CollisionDetection;
};

export function createLineupCollisionDetection(detectors: CollisionDetectors = { pointerWithin, closestCenter }): CollisionDetection {
  return (args) => {
    if (args.active.data.current?.type === 'skill') {
      const pointerCollisions = detectors.pointerWithin(args);
      return pointerCollisions.length > 0 ? pointerCollisions : detectors.closestCenter(args);
    }

    return detectors.closestCenter(args);
  };
}
