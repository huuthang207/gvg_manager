## MODIFIED Requirements

### Requirement: Squad member assignments
The system SHALL allow each squad to contain zero through six active members of its guild. A member SHALL be assigned to no more than one squad in the same Bang Chiến layout. Squad cards SHALL display every assigned member with their name and class icon. For each editable slot, the system SHALL provide a temporary class filter through a custom dark-theme class picker that displays class icons and names instead of a native select. The class picker SHALL include an unfiltered state and SHALL NOT persist its selection as lineup data. An editable slot SHALL use the selected temporary class to tint its background and border while it is empty; once the slot contains a member, its displayed icon and tint SHALL use that member's `classType`. The member selection control SHALL be a custom dark-theme picker with name search and class icon/badge presentation. The member picker SHALL list only active, unassigned members matching the effective class filter while retaining the member currently assigned to its own slot. Both pickers SHALL use the application's dark visual language and SHALL be dismissible by selecting an option, clicking outside, or pressing `Escape`.

#### Scenario: A guild owner assigns a sixth member
- **WHEN** a squad has five assigned members and the guild owner assigns an active guild member through the member picker
- **THEN** the member is assigned and the squad displays six members with the member's class icon and class-colored slot tint

#### Scenario: A guild owner assigns a seventh member
- **WHEN** a squad already has six assigned members and the guild owner attempts another assignment
- **THEN** the client prevents the assignment and the server rejects any corresponding layout update

#### Scenario: A guild owner assigns an inactive or duplicate member
- **WHEN** a layout update includes a member who is not active in the guild or is already assigned to another squad
- **THEN** the system rejects the update without changing the saved layout

#### Scenario: A guild owner filters an empty slot by class
- **WHEN** the guild owner opens a slot's class picker and selects a class
- **THEN** the picker displays class icons and names in a dark-theme menu, the empty slot is tinted with that class's color, and its member picker lists only active unassigned members whose `classType` matches the selected class

#### Scenario: A guild owner clears a class filter
- **WHEN** the guild owner chooses the unfiltered option in an empty slot's class picker
- **THEN** the slot returns to its neutral visual state and its member picker lists all eligible active unassigned members

#### Scenario: A member is already assigned elsewhere in the lineup
- **WHEN** a guild owner opens the member picker for a slot and a member is assigned in any other slot of the current Bang Chiến layout
- **THEN** that member is excluded from the picker results

#### Scenario: A guild owner searches class-filtered candidates
- **WHEN** a guild owner enters a name query in an open member picker
- **THEN** the picker displays only eligible candidates whose names match the query while retaining the selected class eligibility filter

#### Scenario: A guild owner views the current assignment in its own slot
- **WHEN** a slot already has an assigned member and the guild owner opens its member picker
- **THEN** its currently assigned member remains available, the class trigger displays that member's class icon, and the slot tint matches that member's class

#### Scenario: A guild owner removes a member from a slot
- **WHEN** the guild owner uses the compact minus control to remove an assigned member
- **THEN** the slot is cleared, its temporary class filter returns to the unfiltered default state, the slot returns to its neutral visual state, and the removed active member becomes selectable in other eligible slots

#### Scenario: A guild owner dismisses an open picker
- **WHEN** a guild owner presses `Escape` or clicks outside an open class or member picker
- **THEN** the picker closes without modifying the current filter or member assignment

#### Scenario: A guild owner clears a squad
- **WHEN** the guild owner selects the clear-squad action and confirms it
- **THEN** the system removes all member assignments from that squad while preserving its squad number and division assignment
