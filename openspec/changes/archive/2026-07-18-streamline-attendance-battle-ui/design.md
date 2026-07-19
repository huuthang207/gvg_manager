## Context

`AttendanceView.tsx` currently presents a persistent three-section administrative sidebar beside the active session and recent attendance history. Configuration, daily operations, battle participation management, destructive cleanup, and attendance history management are all visible at once. The active-session card duplicates refresh and close actions already offered by the sidebar. The history detail modal is built from separate summary, toolbar, voted-list, and not-voted-list sections; it supports the available data but remains vertically dense and separates related members into two columns.

The accepted UX direction is a minimal operational workspace: focus the primary surface on the current attendance session and common next actions, while exposing rare setup and destructive actions only from an explicit management surface. Existing frontend services already provide every operation required; this is a presentation/state-organization change only.

## Goals / Non-Goals

**Goals:**
- Make the primary attendance surface immediately communicate active-session status and the appropriate next action.
- Remove duplicate session actions and prevent destructive or infrequent controls from competing with daily attendance work.
- Preserve access to channel configuration, attendance history management, GvG participation history, and month-level GvG cleanup through intentional secondary navigation.
- Make a closed-session history review easy to scan through a compact summary, status filter, and unified member list.
- Preserve responsive behavior, existing data derivation, service calls, confirmation dialogs, and authorization.

**Non-Goals:**
- No change to attendance API contracts, data models, permissions, Discord messages, vote choices, or session lifecycle.
- No change to the GvG participation finalization modal in this change.
- No new analytics, exports, pagination API, or data retention policy.
- No replacement of shared UI primitives or global visual theme.

## Decisions

### 1. Use a single-column operational workspace and a secondary management modal
**Decision:** Replace the permanent sidebar with a single primary content flow: header, active-session card or empty state, quick actions, and a read-only recent-history list. Add a `Quản lý` entry point in the header that opens the existing management operations in a secondary modal/panel.

**Rationale:** The default task is running and reviewing attendance, not configuration or cleanup. A secondary surface keeps all existing administrative capabilities available without giving them equal visual priority.

**Alternatives considered:**
- Keep the two-column layout and collapse individual sections: reduces width but leaves management noise on the default screen.
- Hide controls behind many inline menus: compact but makes essential discovery and accessibility worse.

### 2. Give current-session actions one authoritative location
**Decision:** When a session is open, `Chi tiết`, `Làm mới`, and `Đóng phiên` appear only inside the active-session card. When no session is open, the empty state provides the `Mở điểm danh` CTA. Quick actions retain `Chốt tham gia bang chiến`; the open-session action is disabled or omitted while a session is active.

**Rationale:** Each operation has one predictable home, eliminating the current duplicate refresh and close controls while keeping session-aware actions visible in context.

**Alternatives considered:**
- Retain sidebar controls as shortcuts: duplicates behavior and preserves the core hierarchy issue.
- Place all actions in the header: makes session-specific state less obvious and crowds narrow layouts.

### 3. Isolate management and destructive history operations
**Decision:** Channel configuration, GvG participation history, and monthly GvG deletion move into the management surface. Recent attendance history is read-only; the all-history modal is the sole place for selection and bulk/single deletion controls.

**Rationale:** Viewing history is common and low-risk, while deletion requires deliberate context. The existing confirmations remain the final safeguard.

**Alternatives considered:**
- Keep delete affordances on each recent-history row: provides speed but makes the main screen visually and operationally noisy.
- Remove bulk deletion entirely: out of scope because existing functionality must remain available.

### 4. Use a unified history-review list with status filters
**Decision:** History details show a compact header/response summary followed by status pills (`Tất cả`, `Tham gia`, `Không tham gia`, `Chưa phản hồi`), search, and class filter. A single scrollable list/table represents active members whether or not they voted, including name, class, response status, and vote time (or an empty time state). Class composition becomes a collapsible secondary section.

**Rationale:** A single data surface lets users find an individual and compare response status without switching between parallel lists. Status pills replace the redundant choice dropdown and emphasize the most useful review paths.

**Alternatives considered:**
- Keep separate voted/not-voted panels: preserves existing code but wastes vertical space and separates comparable records.
- Use tabs for class composition: adds a context switch for data that is secondary rather than competing with the member review.

### 5. Preserve existing data derivation and only compose view models locally
**Decision:** Derive unified rows locally from active members and `AttendanceSession.votes`, using existing snapshot name/class helpers and member fallbacks. Keep existing API calls, local pagination, and dialog handling unchanged.

**Rationale:** The backend already provides the data needed for every view. Local composition is low-risk and avoids contract changes for a visual redesign.

**Alternatives considered:**
- Add a backend endpoint with precomputed review rows: unnecessary coupling and migration scope for a client-only layout change.

## Risks / Trade-offs

- **[Risk]** Moving controls to a management modal can make rare operations less discoverable. → **Mitigation:** Use an explicit labelled `Quản lý` button in the page header and concise group labels inside the modal.
- **[Risk]** A unified member list may be less dense than two specialized panels for large guilds. → **Mitigation:** Keep concise rows, sticky/list filters, vertical scrolling, and status counts.
- **[Risk]** Combining active members with vote data must correctly handle inactive members and snapshots. → **Mitigation:** Build the review list from active members, preserve vote snapshot name/class when available, and retain the existing vote-only total/count behavior.
- **[Risk]** Refactoring a large single component can introduce regressions in modal state. → **Mitigation:** Extract focused presentational components or helpers where useful, retain existing state names/service callbacks, and validate the active, inactive, loading, and error states.

## Migration Plan

1. Deploy as a frontend-only release with no migration or API rollout requirement.
2. Validate an open session, no active session, closed-history review, all-history deletion, management channel save, GvG history, and monthly GvG delete against existing services.
3. Roll back by deploying the previous frontend build; persisted attendance and GvG data are untouched.

## Open Questions

- None. The approved scope keeps the GvG participation finalization modal unchanged; it can be streamlined separately after the workspace redesign is validated.
