# Skill Drag Overlay Centered Inside Tile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the small skill drag preview at the center of the original skill tile footprint when dragging starts.

**Architecture:** Keep the change local to the skill `DragOverlay` branch in `frontend/src/features/lineup/TeamLayout.tsx`. The overlay outer wrapper should match the skill pool tile footprint and center a smaller 48px preview inside it; remove the previous custom transform so dnd-kit positions the outer footprint naturally.

**Tech Stack:** React 19, TypeScript, Vite, `@dnd-kit/core`, Tailwind CSS utility classes.

---

## File Structure

- Modify: `frontend/src/features/lineup/TeamLayout.tsx`
  - Responsibility: Renders the lineup DnD context and drag overlays.
  - Change: Adjust only the skill overlay branch to use a tile-sized outer wrapper with a centered 48px inner icon.
- No new source files.

## Task 1: Center small skill preview inside tile footprint

**Files:**
- Modify: `frontend/src/features/lineup/TeamLayout.tsx:861-867`

- [ ] **Step 1: Inspect current skill overlay markup**

Confirm the skill `DragOverlay` branch currently contains a 48px wrapper with either centered classes or a custom transform:

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

- [ ] **Step 2: Replace skill overlay with tile footprint wrapper**

Replace only the skill overlay wrapper with this markup:

```tsx
<div className="aspect-square w-full max-w-[88px] rounded-xl border border-amber-500/60 bg-slate-900/70 p-2.5 flex items-center justify-center shadow-2xl shadow-amber-950/30">
  <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-800 border border-amber-500">
    {activeData.skill.logo && (
      <img src={activeData.skill.logo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
    )}
  </div>
</div>
```

This removes the custom transform and lets the small 48px icon sit in the center of a tile-like overlay footprint.

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

Expected: The skill overlay branch no longer has `style={{ transform: ... }}` or `-translate-*` classes. It has an outer tile-like wrapper and an inner `w-12 h-12` icon wrapper. Existing unrelated local changes may still appear in the main repo; do not overwrite them.

- [ ] **Step 5: Apply to main without overwriting unrelated changes**

Manually apply the same scoped overlay markup to `D:\Project\gvg_manager\frontend\src\features\lineup\TeamLayout.tsx` if working from an isolated worktree. Do not reset, stash, or overwrite unrelated main-repo changes. Run:

```powershell
npm run lint --prefix frontend
```

Expected: `tsc --noEmit` completes with exit code 0.

## Self-Review

- Spec coverage: The task centers the small overlay icon inside a tile-sized footprint and removes prior cursor transform behavior.
- Placeholder scan: No placeholders or unspecified implementation remain.
- Type consistency: The plan uses existing `activeData.skill.logo` markup and Tailwind classes only.
