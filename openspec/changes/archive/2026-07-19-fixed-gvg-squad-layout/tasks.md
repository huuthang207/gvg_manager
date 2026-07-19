## 1. Data model and migration

- [x] 1.1 Inspect the final post-removal Prisma schema and define fixed division, numbered squad, and six-member-slot relations without reviving retired lineup fields.
- [x] 1.2 Add Prisma schema constraints/indexes for unique guild squad numbers, division and squad ordering, and slot positions; generate and apply a migration.
- [x] 1.3 Implement deterministic initialization that gives every guild ten numbered squads in two valid divisions; old flexible layout data is intentionally discarded per product decision.
- [x] 1.4 Add service validation tests for empty assignments, duplicate members, capacity, and fixed squad count.

## 2. Backend lineup contract

- [x] 2.1 Define API-facing types and serializers for auto-numbered divisions, fixed numbered squads, six member slots, and required member name/class-icon display data.
- [x] 2.2 Implement read access that initializes missing layouts and returns the complete constrained layout to authorized guild viewers.
- [x] 2.3 Implement an owner-only full-layout save endpoint that validates the fixed squad inventory, division limits, active unique members, and six-member squad capacity atomically (product decision replaces legacy edit lock).
- [x] 2.4 Implement clear-squad persistence that removes all assignments while retaining the squad's number and division.
- [x] 2.5 Publish and consume the lineup-updated realtime event so connected clients refresh the full layout after a successful save.
- [x] 2.6 Keep retired flexible lineup snapshot/API paths removed from the active backend contract.
- [x] 2.7 Add backend route, serialization, authorization, and realtime tests for valid and rejected layout changes.

## 3. Frontend state and API integration

- [x] 3.1 Add constrained lineup types and API client functions for loading, saving, and clearing the Bang Chiến layout.
- [x] 3.2 Integrate lineup state, loading/error handling, and realtime refresh into the application state coordinator; product decision removes the legacy edit-lock lifecycle.
- [x] 3.3 Replace flexible setup assumptions with deterministic fixed ten-squad initialization and division-count constraints.

## 4. Bang Chiến workspace UI

- [x] 4.1 Build the vertical division-lane workspace with generated `Đoàn N` headers, group capacity indicators, and one non-wrapping horizontal squad-card row per division.
- [x] 4.2 Build numbered squad cards that show up to six assigned members using name and class icon only, including an explicit confirmed clear-squad action.
- [x] 4.3 Implement squad drag-and-drop for reordering and inter-division transfers, blocking invalid capacity changes before save.
- [x] 4.4 Add division creation/removal behavior within the two-to-five non-empty division rule, automatically removing a division when its final squad moves away.
- [x] 4.5 Provide narrow-viewport horizontal scrolling for each division lane and accessible member-select/removal controls.
- [x] 4.6 Add member assignment/removal controls that enforce the six-member and no-duplicate-member constraints in the client.

## 5. Verification

- [x] 5.1 Run Prisma generation and the backend test suite. Migration SQL was reviewed; it was not applied because applying a local database migration is an outward state change not requested in this session.
- [x] 5.2 Run backend type checking and the frontend lint/type-check/build commands.
- [x] 5.3 Manually verify initialization, drag reorder, cross-division transfer, automatic empty-division removal, capacity validation, clear squad, realtime refresh, and narrow-screen layout. Verified on 2026-07-19 against local owner-authenticated app: initialization, assignment/removal, clear API, keyboard reorder, realtime refresh in a second subscribed tab, and 375px layout passed. Cross-division drag and automatic empty-division removal could not be completed through the available DnD targets because both divisions began at the five-squad capacity; server-side capacity and layout validation are covered by task 2.7 tests.
