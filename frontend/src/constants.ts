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
  'Toái Mộng': '#22D3EE', // Cyan
  'Cửu Linh': '#A78BFA', // Purple
  'Long Ngâm': '#4ADE80', // Green
  'Thiết Y': '#FBBF24', // Amber
  'Tố Vấn': '#F472B6', // Pink (Hồng nhạt)
  'Thần Tương': '#3B82F6', // Blue (Xanh nước)
  'Huyết Hà': '#EF4444', // Red
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
