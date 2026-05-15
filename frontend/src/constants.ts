/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ClassType, Member, DivisionType } from './types.ts';

export const CLASSES: ClassType[] = [
  'Toái Mộng',
  'Cửu Linh',
  'Long Ngâm',
  'Thiết Y',
  'Tố Vấn',
  'Thần Tương',
  'Huyết Hà',
];

export const CLASS_COLORS: Record<ClassType, string> = {
  'Toái Mộng': '#06B6D4',
  'Cửu Linh': '#8B5CF6',
  'Long Ngâm': '#22C55E',
  'Thiết Y': '#F59E0B',
  'Tố Vấn': '#EC4899',
  'Thần Tương': '#3B82F6',
  'Huyết Hà': '#EF4444',
};

export const CLASS_ICONS: Record<ClassType, string> = {
  'Toái Mộng': '/class_icon/toaimong.png',
  'Cửu Linh': '/class_icon/cuulinh.png',
  'Long Ngâm': '/class_icon/longngam.png',
  'Thiết Y': '/class_icon/thiety.png',
  'Tố Vấn': '/class_icon/tovan.png',
  'Thần Tương': '/class_icon/thantuong.png',
  'Huyết Hà': '/class_icon/huyetha.png',
};

// Mock data for guild members
export const MOCK_MEMBERS: Member[] = [];

export const INITIAL_DIVISIONS: Record<DivisionType, { teams: number }> = {
  'Thủ': { teams: 5 },
  'Công': { teams: 3 },
  'Trợ': { teams: 2 },
};
