export type ClassType =
  | 'Toái Mộng'
  | 'Cửu Linh'
  | 'Long Ngâm'
  | 'Thiết Y'
  | 'Tố Vấn'
  | 'Thần Tương'
  | 'Huyết Hà'
  | 'Chưa xác định'
  | 'Xung đột role phái';

export interface Member {
  id: string;
  name: string;
  ingameName?: string | null;
  discordDisplayName?: string | null;
  classType: ClassType;
  joinedAt?: string | null;
  active?: boolean;
  level?: number;
  power?: number;
  discordId?: string;
  discordUsername?: string;
  discordRoles?: string[];
  avatar?: string | null;
  gvgParticipationCount?: number;
}
