export interface Team {
  id: string;
  name: string;
  memberIds: string[];
  reserveMemberIds: string[];
  slotSkills?: Record<string, string[]>;
}

export interface SquadTeam {
  id: string;
  name: string;
  memberIds: string[];
  reserveMemberIds: string[];
  slotSkills?: Record<string, string[]>;
}

export interface SquadGroup {
  id: string;
  name: string;
  leaderMemberId?: string | null;
  teams: SquadTeam[];
}

export type DivisionType = 'Thủ' | 'Công' | 'Trợ';

export interface Division {
  type: DivisionType;
  teams: Team[];
}

export interface SquadState {
  divisions: {
    [key in DivisionType]: Division;
  };
  memberPool: import('./member.ts').Member[];
}

export interface LineupSnapshotData {
  id: string;
  name: string;
  leaderMemberId?: string | null;
  teams: Array<{ id: string; name: string; memberIds: string[]; reserveMemberIds: string[]; slotSkills?: Record<string, string[]> }>;
}

export interface LineupSnapshotSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  groupCount: number;
  teamCount: number;
}

export interface LineupSnapshotDetail {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  groups: LineupSnapshotData[];
}
