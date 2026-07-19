## Context

Attendance currently assumes one untyped configuration and one untyped open session per guild. `AttendanceChannelConfig` is keyed only by `guildId`; `AttendanceSession` has no category; service queries open sessions only by guild; Discord buttons use `attendance:<choice>:<sessionId>`; and the bot exposes a GvG-specific command. The frontend receives one `attendance` object in app state and presents one operational workspace.

The approved MVP introduces independent Scrim attendance. It must have a dedicated Discord channel, session lifecycle, history, and command while retaining the current two-choice attendance behavior. A GvG and Scrim session must be able to run concurrently; the application must not become a Scrim roster or match-management module.

## Goals / Non-Goals

**Goals:**
- Model GvG and Scrim as independently configurable attendance categories.
- Allow one open session per `(guild, type)` and support one GvG plus one Scrim session at the same time.
- Reuse session/vote persistence, snapshotting, serialization, Discord rendering, realtime publication, history review, and permissions.
- Make the existing attendance workspace type-aware through a clear GvG/Scrim selector while retaining the streamlined operational layout.
- Preserve existing GvG data and behavior after migration.

**Non-Goals:**
- No Scrim roster finalization, match opponent, schedule, result, team, or attendance-derived lineup management.
- No change to the `GO`/`NOGO` vote choices or `manage:attendance` authorization.
- No parallel replacement attendance services, bot clients, or separate React page.
- No dependency additions.

## Decisions

### 1. Add a shared attendance type enum to configuration and sessions
**Decision:** Add an `AttendanceType` enum with `GVG` and `SCRIM`. Add `type` to `AttendanceSession`; change channel configuration from one row per guild to a unique `(guildId, type)` row.

**Rationale:** The two flows share the same lifecycle and vote mechanics but need independent open-session and channel scopes. A category field supports both without duplicated tables/services.

**Alternatives considered:**
- Copy all models/routes/services with Scrim names: straightforward at first but doubles maintenance and risks behavior drift.
- Use one shared channel setting: reduces migration work but conflicts with the agreed independent Scrim channel.

### 2. Backfill legacy records as GVG
**Decision:** The migration gives existing `AttendanceSession` and `AttendanceChannelConfig` rows `GVG` values. Existing GvG endpoints/commands omit type and default to `GVG`.

**Rationale:** Current production data semantically represents Bang Chiến attendance. Defaulting preserves existing consumers and permits an incremental frontend transition.

**Alternatives considered:**
- Require users to recreate channel configuration: disruptive and unnecessary.
- Make type nullable indefinitely: obscures invariants and complicates unique constraints.

### 3. Thread attendance type through shared service and Discord helpers
**Decision:** Add explicit `type` parameters to typed service methods, queries, app-state builders, Discord button custom IDs, render content, and refresh queues. Parsed button IDs must carry type and session ID, with the server still validating session ownership/status/type.

**Rationale:** Type must scope every operation that can otherwise accidentally target the other flow. Explicit values are clearer and safer than inferring type from title or channel.

**Alternatives considered:**
- Infer type from Discord channel: ambiguous if a configuration changes or a message is moved.
- Encode only session ID in buttons and look up type implicitly: workable but does not make cross-type routing self-describing and makes rendering/diagnostics weaker.

### 4. Add a dedicated Scrim slash command and keep GvG command compatibility
**Decision:** Keep `/diemdanhbangchien` as the GVG command, add `/diemdanhscrim` with the same `open`, `close`, and `refresh` subcommands, and use type-specific channel configuration commands/management UI.

**Rationale:** The approved MVP calls for commands that are easily recognizable in Discord. Existing GvG command usage remains unchanged.

**Alternatives considered:**
- One command with a required type option: fewer registered commands but adds a repeated type-selection step and risks opening the wrong type.

### 5. Select attendance type in a shared frontend workspace
**Decision:** The frontend state exposes GVG and Scrim attendance states keyed by type. The existing streamlined workspace renders a tab/segmented selector and binds operations, management channel config, active session, and history to the selected type. GvG-only finalization and monthly cleanup are shown only in the GVG tab.

**Rationale:** Reusing the same UI preserves user familiarity and avoids duplicating history-review functionality. Type-specific actions remain clear and prevent Scrim from inheriting GvG roster behavior.

**Alternatives considered:**
- Separate Scrim page/sidebar entry: creates redundant UI and navigation complexity for the same core interaction.

## Risks / Trade-offs

- **[Risk]** Migration changes a former `guildId` uniqueness constraint. → **Mitigation:** backfill `GVG`, replace it with an explicit compound unique constraint, generate Prisma client, and test upgrade against existing rows.
- **[Risk]** Missing type filters could show or operate on the wrong session. → **Mitigation:** type every service entry point, use compound filters consistently, and add separate service/route tests for concurrent GVG/SCRIM sessions.
- **[Risk]** Stale legacy Discord messages use the old custom-ID shape. → **Mitigation:** preserve parser compatibility for the legacy format as GVG, while all new messages use the typed format.
- **[Risk]** Frontend app-state changes touch shared bootstrap/realtime consumers. → **Mitigation:** preserve a GVG-compatible default while updating all typed consumers together and type-check the full frontend.

## Migration Plan

1. Add enum/type columns and backfill all existing attendance config/session rows to `GVG` in a Prisma migration.
2. Replace the configuration uniqueness constraint with `(guildId, type)` and add session indexes that include type/status.
3. Deploy backend/service/bot support, then frontend selector and typed API calls; retain GVG defaults for existing command/API paths during rollout.
4. Configure a Scrim channel after deployment and register the new Discord command.
5. Roll back application code only after confirming migration compatibility; database rollback requires a forward migration that maps typed records back only if no Scrim records exist, so a data backup is required before destructive rollback.

## Open Questions

- None for MVP. Scrim-specific roster, opponent, schedule, and results are explicitly deferred.
