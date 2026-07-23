## MODIFIED Requirements

### Requirement: Squad member assignments
The system SHALL allow each squad to contain zero through six active members of its guild. A member SHALL be assigned to no more than one squad in the same Bang Chiến layout. Squad cards SHALL display assigned members with their name and class icon. For each editable slot, the system SHALL provide a temporary class filter that limits the member dropdown to active, unassigned members of that class; the temporary filter SHALL NOT be persisted as lineup data. The member dropdown SHALL exclude every member assigned in another slot of the same layout while retaining the member currently assigned to its own slot.

#### Scenario: A guild owner assigns a sixth member
- **WHEN** a squad has five assigned members and the guild owner assigns an active guild member
- **THEN** the member is assigned and the squad displays six members

#### Scenario: A guild owner assigns a seventh member
- **WHEN** a squad already has six assigned members and the guild owner attempts another assignment
- **THEN** the client prevents the assignment and the server rejects any corresponding layout update

#### Scenario: A guild owner assigns an inactive or duplicate member
- **WHEN** a layout update includes a member who is not active in the guild or is already assigned to another squad
- **THEN** the system rejects the update without changing the saved layout

#### Scenario: A guild owner filters candidates by class
- **WHEN** the guild owner selects a class in the temporary filter of an empty squad slot
- **THEN** that slot's member dropdown displays only active, unassigned members whose `classType` matches the selected class

#### Scenario: A member is already assigned elsewhere in the lineup
- **WHEN** a guild owner opens the member dropdown for a slot and a member is assigned in any other slot of the current Bang Chiến layout
- **THEN** that member is excluded from the dropdown

#### Scenario: A guild owner views the current assignment in its own slot
- **WHEN** a slot already has an assigned member and the guild owner opens that slot's dropdown
- **THEN** its currently assigned member remains available and the temporary class filter displays that member's class

#### Scenario: A guild owner removes a member from a slot
- **WHEN** the guild owner uses the compact minus control to remove an assigned member
- **THEN** the slot is cleared, the temporary class filter returns to its unfiltered default state, and the removed active member becomes selectable in other eligible slots

#### Scenario: A guild owner clears a squad
- **WHEN** the guild owner selects the clear-squad action and confirms it
- **THEN** the system removes all member assignments from that squad while preserving its squad number and division assignment
