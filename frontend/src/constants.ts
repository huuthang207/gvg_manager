/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ClassType, Member } from './types.ts';

export const UNKNOWN_CLASS: ClassType = 'Chưa xác định';
export const CONFLICT_CLASS: ClassType = 'Xung đột role phái';

export const CLASSES = [
  'Toái Mộng',
  'Cửu Linh',
  'Long Ngâm',
  'Thiết Y',
  'Tố Vấn',
  'Thần Tương',
  'Huyết Hà',
] as const satisfies readonly ClassType[];

export const CLASS_COLORS: Record<ClassType, string> = {
  'Toái Mộng': '#06B6D4',
  'Cửu Linh': '#8B5CF6',
  'Long Ngâm': '#22C55E',
  'Thiết Y': '#F59E0B',
  'Tố Vấn': '#EC4899',
  'Thần Tương': '#3B82F6',
  'Huyết Hà': '#EF4444',
  'Chưa xác định': '#94A3B8',
  'Xung đột role phái': '#F97316',
};

export const CLASS_ICONS: Partial<Record<ClassType, string>> = {
  'Toái Mộng': '/class_icon/toaimong.png',
  'Cửu Linh': '/class_icon/cuulinh.png',
  'Long Ngâm': '/class_icon/longngam.png',
  'Thiết Y': '/class_icon/thiety.png',
  'Tố Vấn': '/class_icon/tovan.png',
  'Thần Tương': '/class_icon/thantuong.png',
  'Huyết Hà': '/class_icon/huyetha.png',
};

export function getClassColor(classType: string) {
  return CLASS_COLORS[classType as ClassType] ?? '#94A3B8';
}

export function getClassIcon(classType: string) {
  return CLASS_ICONS[classType as ClassType] ?? null;
}

// Mock data for guild members
export const MOCK_MEMBERS: Member[] = [];
