# Skill Drag Overlay Corner Inset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Position the shrunken skill drag preview so the cursor sits slightly inside the preview's bottom-right corner.

**Architecture:** Keep the change local to the skill `DragOverlay` branch in `frontend/src/features/lineup/TeamLayout.tsx`. Replace the previous centered overlay classes with a local inline transform of `translate(calc(-100% + 6px), calc(-100% + 6px))`, leaving member dragging, collision detection, and assignment logic unchanged.

**Tech Stack:** React 19, TypeScript, Vite, `@dnd-kit/core`, Tailwind CSS utility classes.

---

## File Structure

- Modify: `frontend/src/features/lineup/TeamLayout.tsx`
  - Responsibility: Renders the lineup DnD context and drag overlays.
  - Change: Adjust only the skill overlay wrapper position.
- No new source files.

## Task 1: Move skill overlay cursor anchor to bottom-right inset

**Files:**
- Modify: `frontend/src/features/lineup/TeamLayout.tsx:861-866`

- [ ] **Step 1: Inspect current skill overlay markup**

Confirm the skill `DragOverlay` branch contains this wrapper or the previously centered variant:

```tsx
<div className="w-12 h-12 -translate-x-1/2 -translate-y-1/2 bg-slate-800 border border-amber-500 rounded-lg overflow-hidden shadow-2xl">
  {activeData.skill.logo && (
    <img src={activeData.skill.logo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
  )}
</div>
```

- [ ] **Step 2: Apply the bottom-right inset transform**

Replace only the skill overlay wrapper with this markup:

```tsx
<div
  className="w-12 h-12 bg-slate-800 border border-amber-500 rounded-lg overflow-hidden shadow-2xl"
  style={{ transform: 'translate(calc(-100% + 6px), calc(-100% + 6px))' }}
>
  {activeData.skill.logo && (
    <img src={activeData.skill.logo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
  )}
</div>
```

This positions the 48px overlay above-left of the pointer while keeping the pointer 6px inside the overlay's bottom-right corner.

- [ ] **Step 3: Run frontend typecheck**

Run:

```powershell
npm run lint --prefix frontend
```

Expected: `tsc --noEmit` completes with exit code 0.

- [ ] **Step 4: Inspect the diff**

Run:

```powershell
git diff -- frontend/src/features/lineup/TeamLayout.tsx
```

Expected: The only new implementation change for this task is the skill overlay wrapper transform. Existing unrelated local changes may still appear in the main repo; do not overwrite them.

- [ ] **Step 5: Merge into main carefully**

The user requested a force merge into `main`. Because the main repo already has unrelated local changes, avoid destructive overwrite unless the user confirms the exact files to overwrite. Prefer manually applying the same one-line scoped implementation to `D:\Project\gvg_manager\frontend\src\features\lineup\TeamLayout.tsx`, then run `npm run lint --prefix frontend` in the main repo.

## Self-Review

- Spec coverage: The task changes only the skill overlay anchor to bottom-right inset and preserves all DnD logic.
- Placeholder scan: No placeholders or unspecified implementation remain.
- Type consistency: The plan uses existing `activeData.skill.logo` markup and a valid React `style` prop.
