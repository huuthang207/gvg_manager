## MODIFIED Requirements

### Requirement: Squad members and metadata
The system SHALL allow each squad to contain six member slots. A member SHALL be assigned to no more than one squad in the same Bang Chiến layout and SHALL be active in the guild. When the lineup has an attendance roster source, a member newly assigned to a squad SHALL have an AttendanceVote of `GO` in that source session; an existing assignment MAY remain after its member no longer satisfies that attendance eligibility and MUST be identified as ineligible in the lineup UI. Each squad SHALL have a persisted owner-editable name that defaults to `Tổ đội <number>` and SHALL keep that name when moved between divisions or when slots change.

#### Scenario: A guild owner assigns a member
- **WHEN** the guild owner changes a squad's six member-slot assignments
- **THEN** the system accepts only active unassigned guild members and persists the complete slot assignment for that squad
- **THEN** when an attendance roster source is selected, every newly assigned member MUST have vote `GO` in that source session

#### Scenario: A guild owner retains an existing ineligible member
- **WHEN** an existing squad member no longer has vote `GO` in the selected attendance source and the owner submits a slot update that retains that member
- **THEN** the system MUST allow that existing assignment to remain
- **THEN** the lineup UI MUST identify the member as no longer eligible for new assignments

#### Scenario: A guild owner clears a squad
- **WHEN** the guild owner clears a squad
- **THEN** the system removes all member assignments while retaining the squad, name, number, and containing division

#### Scenario: A guild owner renames a squad
- **WHEN** the guild owner confirms a valid inline squad-name edit
- **THEN** the system persists the name while keeping the immutable squad number unchanged

#### Scenario: A non-owner views a squad name
- **WHEN** a non-owner views Bang Chiến
- **THEN** the system displays squad names without name-edit controls
