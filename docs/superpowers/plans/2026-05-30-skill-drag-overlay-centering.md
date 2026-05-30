# Skill Drag Overlay Centering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Center the skill drag preview under the cursor while preserving existing member dragging and skill drop behavior.

**Architecture:** Keep the change local to the skill `DragOverlay` branch in `TeamLayout.tsx`. The skill overlay is 48px by 48px, so a presentation-only `translate(-24px, -24px)` offset moves its center to the pointer without touching drag sensors, collision detection, or drag-end data flow.

**Tech Stack:** React 19, TypeScript, Vite, `@dnd-kit/core`, Tailwind CSS utility classes.

---

## File Structure

- Modify: `frontend/src/features/lineup/TeamLayout.tsx`
  - Responsibility: Renders the lineup drag/drop context and drag overlays for members and skills.
  - Change: Add a `-translate-x-1/2 -translate-y-1/2` Tailwind offset only to the skill overlay wrapper, which is already `w-12 h-12`.
- No new files.
- No unit test changes: this is a pointer-position presentation change on a `DragOverlay`, and the repository currently has no frontend DOM/browser test harness configured for this behavior.

## Task 1: Center skill drag overlay

**Files:**
- Modify: `frontend/src/features/lineup/TeamLayout.tsx:861-866`

- [ ] **Step 1: Inspect current skill overlay markup**

Read `frontend/src/features/lineup/TeamLayout.tsx` around the `DragOverlay` block and confirm the skill branch currently renders this wrapper:

```tsx
<div className="w-12 h-12 bg-slate-800 border border-amber-500 rounded-lg overflow-hidden shadow-2xl">
  {activeData.skill.logo && (
    <img src={activeData.skill.logo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
  )}
</div>
```

- [ ] **Step 2: Apply the local overlay offset**

In `frontend/src/features/lineup/TeamLayout.tsx`, replace the skill overlay wrapper with this exact markup:

```tsx
<div className="w-12 h-12 -translate-x-1/2 -translate-y-1/2 bg-slate-800 border border-amber-500 rounded-lg overflow-hidden shadow-2xl">
  {activeData.skill.logo && (
    <img src={activeData.skill.logo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
  )}
</div>
```

This keeps the member overlay branch unchanged and avoids changing `DndContext`, `collisionDetection`, `handleDragStart`, or `handleDragEnd`.

- [ ] **Step 3: Run frontend typecheck**

Run from the frontend package:

```powershell
npm run lint
```

Expected: TypeScript finishes successfully with no new errors.

- [ ] **Step 4: Manually verify drag behavior in browser**

Run the frontend dev server from `frontend/` if it is not already running:

```powershell
npm run dev
```

Open the app, navigate to the lineup workspace, switch the side panel to `Kỹ năng`, and drag a skill.

Expected:
- The dragged skill preview is centered under the cursor.
- The original skill tile remains in the skill grid and fades while dragging.
- Dropping onto a lineup member still assigns the skill.
- Dragging members still behaves as before.

- [ ] **Step 5: Commit when requested**

Only commit if the user explicitly asks for a commit. If asked, stage only the implementation file and the approved spec/plan files that should be included:

```powershell
git add frontend/src/features/lineup/TeamLayout.tsx docs/superpowers/specs/2026-05-30-skill-drag-overlay-centering-design.md docs/superpowers/plans/2026-05-30-skill-drag-overlay-centering.md
git commit -m @'
Center skill drag preview under cursor

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
'@
```

## Self-Review

- Spec coverage: The single implementation task applies the `-24px` equivalent offset to the 48px skill overlay, leaves member drag behavior unchanged, and avoids collision/data-flow changes.
- Placeholder scan: No placeholders, TODOs, or unspecified implementation steps remain.
- Type consistency: The plan references existing `activeData.skill.logo`, `DragOverlay`, and `TeamLayout.tsx` markup exactly as used by the current component.
