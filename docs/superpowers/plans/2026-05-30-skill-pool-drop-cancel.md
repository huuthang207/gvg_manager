# Skill Pool Drop Cancel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make dragging a skill from the skill pool back onto the skill pool cancel the drag without assigning the skill to any member.

**Architecture:** Add a dedicated droppable target to the skill pool panel and identify it with `data.type === 'skill-pool'`. Keep all assignment behavior centralized in `TeamLayout.handleDragEnd`, adding an early return for skill drops over that target while preserving existing member/slot assignment behavior.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, `@dnd-kit/core`.

---

## File Structure

- Modify `frontend/src/features/lineup/SkillPool.tsx`
  - Responsibility: render searchable skill source list and expose the skill list area as a droppable cancel target.
- Modify `frontend/src/features/lineup/TeamLayout.tsx`
  - Responsibility: handle drag lifecycle and route skill drops to cancel/member/slot outcomes.
- Verification only; no new test file because the frontend currently has no test framework configured.

---

### Task 1: Register the skill pool as a droppable cancel target

**Files:**
- Modify: `frontend/src/features/lineup/SkillPool.tsx:6-65`

- [ ] **Step 1: Import `useDroppable` in `SkillPool.tsx`**

Change the import from `@dnd-kit/core` so it includes both hooks:

```tsx
import { useDraggable, useDroppable } from '@dnd-kit/core';
```

- [ ] **Step 2: Add the droppable registration inside `SkillPool`**

Inside `SkillPool`, directly after `const [search, setSearch] = useState('');`, add:

```tsx
const { setNodeRef, isOver } = useDroppable({
  id: 'skill-pool',
  data: {
    type: 'skill-pool',
  },
});
```

- [ ] **Step 3: Attach the droppable ref and visual state to the skill list area**

Replace the skill list container opening tag:

```tsx
<div className="flex-1 overflow-y-auto p-3 grid grid-cols-3 gap-2 custom-scrollbar bg-slate-950/10 content-start">
```

with:

```tsx
<div
  ref={setNodeRef}
  className={cn(
    'flex-1 overflow-y-auto p-3 grid grid-cols-3 gap-2 custom-scrollbar bg-slate-950/10 content-start transition-colors',
    isOver && 'bg-amber-500/5 ring-1 ring-inset ring-amber-400/25',
  )}
>
```

This makes the visible list area the drop target. Dropping a skill over this area should produce `over.id === 'skill-pool'` or `over.data.current.type === 'skill-pool'` in `TeamLayout.handleDragEnd`.

- [ ] **Step 4: Run frontend type check**

Run from `frontend/`:

```bash
npm run lint
```

Expected: TypeScript completes without errors.

---

### Task 2: Cancel skill drags when dropped on the skill pool

**Files:**
- Modify: `frontend/src/features/lineup/TeamLayout.tsx:359-375`

- [ ] **Step 1: Add an early return in the skill drop branch**

In `TeamLayout.handleDragEnd`, find:

```tsx
// Handle Skill dropping
if (sourceData.type === 'skill') {
  const skill = sourceData.skill as Skill;

  if (overData?.type === 'member-target') {
    onAssignSkillToMember(overData.member.id, skill);
    return;
  }

  if (isValidSlotId(squadGroups, dropId)) {
    const memberIdInSlot = getMemberIdInSlotFromGroups(squadGroups, dropId);
    if (memberIdInSlot) {
      onAssignSkillToMember(memberIdInSlot, skill);
    }
  }
  return;
}
```

Replace it with:

```tsx
// Handle Skill dropping
if (sourceData.type === 'skill') {
  const skill = sourceData.skill as Skill;

  if (overData?.type === 'skill-pool' || dropId === 'skill-pool') {
    return;
  }

  if (overData?.type === 'member-target') {
    onAssignSkillToMember(overData.member.id, skill);
    return;
  }

  if (isValidSlotId(squadGroups, dropId)) {
    const memberIdInSlot = getMemberIdInSlotFromGroups(squadGroups, dropId);
    if (memberIdInSlot) {
      onAssignSkillToMember(memberIdInSlot, skill);
    }
  }
  return;
}
```

This preserves current behavior for dropping skills onto members and occupied slots, while making skill-pool drops explicit no-ops.

- [ ] **Step 2: Run frontend type check**

Run from `frontend/`:

```bash
npm run lint
```

Expected: TypeScript completes without errors.

---

### Task 3: Browser verification of drag/drop behavior

**Files:**
- Verify: `frontend/src/features/lineup/SkillPool.tsx`
- Verify: `frontend/src/features/lineup/TeamLayout.tsx`

- [ ] **Step 1: Start the frontend dev server**

Run from `frontend/`:

```bash
npm run dev
```

Expected: Vite starts on port 3000.

- [ ] **Step 2: Open the app in a browser**

Navigate to the local Vite URL shown by the dev server, usually:

```text
http://localhost:3000
```

Expected: The app loads. Log in or use the existing session if already authenticated.

- [ ] **Step 3: Verify skill-to-member assignment still works**

In the lineup page:

1. Hold the lineup edit lock if required by the UI.
2. Open the `Kỹ năng` side-panel tab.
3. Drag one skill onto a member in the lineup.

Expected: The skill appears on that member exactly as before.

- [ ] **Step 4: Verify dropping a skill back onto the skill pool cancels**

In the lineup page:

1. Open the `Kỹ năng` side-panel tab.
2. Drag a skill tile from the skill list.
3. Drop it back inside the skill list area.

Expected: No member receives the skill, the skill list remains visible, and no error dialog appears.

- [ ] **Step 5: Verify unrelated member drag/drop behavior still works**

In the lineup page:

1. Switch to the `Thành viên` side-panel tab.
2. Drag an unassigned member into an empty lineup slot.
3. Drag that member back to the member pool.

Expected: Member assignment/removal behavior is unchanged.

---

## Self-Review

- Spec coverage: The plan implements the selected approach: `SkillPool` becomes a droppable target and `TeamLayout` cancels skill drops over it.
- Placeholder scan: No TBD/TODO/placeholder steps remain.
- Type consistency: The droppable data type is consistently named `skill-pool`; `dropId` check uses the same id string.
