# Skill drag overlay centering design

## Goal

When a user drags a skill from the skill pool, the visible drag preview should be centered on the cursor. The original skill tile remains in the grid and fades as it does today.

## Scope

This change applies only to skill dragging in the lineup workspace. Member dragging behavior, collision detection, drop targets, and skill assignment data flow remain unchanged.

## Design

Use the existing skill `DragOverlay` in `frontend/src/features/lineup/TeamLayout.tsx` as the only visual element that follows the pointer during a skill drag. The overlay is currently rendered as a 48px by 48px icon. Apply a presentation-only offset of `-24px` on both axes to the skill overlay so its center aligns with the pointer position.

Keep the offset local to the skill overlay branch. Do not apply it to the member overlay or to the global `DndContext`, because member cards have different dimensions and should preserve their current drag behavior.

## Testing

- Run the frontend TypeScript check from `frontend/` with `npm run lint`.
- If the frontend dev server is available, manually drag a skill from the skill pool to a lineup member and verify the skill icon's center stays under the cursor while dragging.
- Confirm member dragging still behaves as before.
