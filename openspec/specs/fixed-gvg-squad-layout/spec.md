## Purpose

Quy định workspace Bang Chiến với mười tổ đội cố định, phân bổ theo đoàn, gán thành viên có constraint và realtime refresh cho guild.

## Requirements

### Requirement: Fixed numbered squad inventory
The system SHALL maintain exactly ten persistent Bang Chiến squads for each guild. Each squad SHALL have one unique, immutable number from 1 through 10 and SHALL be displayed as `Tổ đội <number>` without a custom squad name.

#### Scenario: A guild opens its first lineup
- **WHEN** an authorized user loads Bang Chiến lineup for a guild that has no lineup data
- **THEN** the system creates and returns squads numbered 1 through 10 in a valid initial division layout

#### Scenario: A squad is rearranged
- **WHEN** the guild owner moves `Tổ đội 7` to a different division or position
- **THEN** the squad remains identified and displayed as `Tổ đội 7`

#### Scenario: A client submits an incomplete squad inventory
- **WHEN** a layout update does not include each squad number from 1 through 10 exactly once
- **THEN** the system rejects the update without changing the saved layout

### Requirement: Constrained division allocation
The system SHALL allocate every squad to exactly one non-empty division. A saved layout SHALL contain from two through five divisions, and each division SHALL contain from one through five squads.

#### Scenario: A guild owner creates another division
- **WHEN** a layout contains fewer than five divisions and the guild owner moves a squad into a new division
- **THEN** the system saves the new non-empty division and displays it in order with the other divisions

#### Scenario: A guild owner exceeds division capacity
- **WHEN** a guild owner attempts to place a sixth squad in a division
- **THEN** the client prevents the placement and the server rejects any corresponding layout update

#### Scenario: Moving the final squad out removes its division
- **WHEN** the guild owner moves the only squad in a division into another division
- **THEN** the empty division is removed from the saved layout and later divisions are relabeled consecutively

#### Scenario: A client submits too few divisions
- **WHEN** a layout update contains fewer than two non-empty divisions
- **THEN** the system rejects the update without changing the saved layout

### Requirement: Auto-numbered division presentation
The system SHALL not support custom division names. It SHALL render divisions in persisted order as `Đoàn 1` through `Đoàn 5` and SHALL not retain empty divisions.

#### Scenario: A division is removed
- **WHEN** the second of three divisions becomes empty and is removed
- **THEN** the former third division is displayed as `Đoàn 2`

#### Scenario: A guild owner views a division
- **WHEN** the guild owner opens the lineup workspace
- **THEN** each division header shows its generated division number and its squad capacity count

### Requirement: Squad member assignments
The system SHALL allow each squad to contain zero through six active members of its guild. A member SHALL be assigned to no more than one squad in the same Bang Chiến layout. Squad cards SHALL display assigned members with their name and class icon.

#### Scenario: A guild owner assigns a sixth member
- **WHEN** a squad has five assigned members and the guild owner assigns an active guild member
- **THEN** the member is assigned and the squad displays six members

#### Scenario: A guild owner assigns a seventh member
- **WHEN** a squad already has six assigned members and the guild owner attempts another assignment
- **THEN** the client prevents the assignment and the server rejects any corresponding layout update

#### Scenario: A guild owner assigns an inactive or duplicate member
- **WHEN** a layout update includes a member who is not active in the guild or is already assigned to another squad
- **THEN** the system rejects the update without changing the saved layout

#### Scenario: A guild owner clears a squad
- **WHEN** the guild owner selects the clear-squad action and confirms it
- **THEN** the system removes all member assignments from that squad while preserving its squad number and division assignment

### Requirement: Division and squad drag-and-drop workspace
The system SHALL display divisions as a vertical sequence of lanes. It SHALL display all squad cards belonging to a single division in one non-wrapping horizontal row and SHALL allow guild owners to drag a squad to reorder within its division or move it to another division with available capacity.

#### Scenario: A guild owner reorders squads in a division
- **WHEN** a guild owner drags a squad before another squad in the same division
- **THEN** the system saves and renders the resulting horizontal order

#### Scenario: A guild owner transfers a squad between divisions
- **WHEN** a guild owner drags a squad to a division with fewer than five squads
- **THEN** the system saves the squad in the target division at the requested position

#### Scenario: A guild owner uses a narrow viewport
- **WHEN** the width cannot fit every squad card in a division
- **THEN** the division preserves one horizontal row and provides horizontal scrolling instead of wrapping squad cards to a second row

### Requirement: Authorized and realtime lineup persistence
The system SHALL require `view:guild` access to retrieve the lineup. It SHALL permit only the guild owner to save a complete layout or clear a squad, SHALL validate and save a complete layout atomically, and SHALL publish `gvg_lineup_updated` after a successful mutation.

#### Scenario: A non-owner attempts a layout mutation
- **WHEN** a guild member without the owner role submits a layout update or clear-squad request
- **THEN** the system rejects the request without changing the saved layout or publishing a lineup update

#### Scenario: A valid layout is saved
- **WHEN** the guild owner submits a valid complete layout
- **THEN** the system saves all division order, squad positions, and member assignments atomically and publishes a `gvg_lineup_updated` realtime event

#### Scenario: A client receives a lineup update
- **WHEN** a subscribed client receives a `gvg_lineup_updated` event for its active guild
- **THEN** the client refreshes and renders the complete current Bang Chiến layout
