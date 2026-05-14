export type ClassType =
  | 'Toái Mộng'
  | 'Cửu Linh'
  | 'Long Ngâm'
  | 'Thiết Y'
  | 'Tố Vấn'
  | 'Thần Tương'
  | 'Huyết Hà';

export interface RoleMapping {
  pattern: RegExp;
  classType: ClassType;
}

const ROLE_MAPPINGS: RoleMapping[] = [
  { pattern: /^toái?\s*mộng$/i, classType: 'Toái Mộng' },
  { pattern: /^cửu?\s*linh$/i, classType: 'Cửu Linh' },
  { pattern: /^long?\s*ngâm$/i, classType: 'Long Ngâm' },
  { pattern: /^thiết?\s*y$/i, classType: 'Thiết Y' },
  { pattern: /^tố?\s*vấn$/i, classType: 'Tố Vấn' },
  { pattern: /^thần?\s*tương$/i, classType: 'Thần Tương' },
  { pattern: /^huyết?\s*hà$/i, classType: 'Huyết Hà' },
];

export function normalizeRoleName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '');
}

export function findClassTypeForRole(roleName: string): ClassType | null {
  const normalized = normalizeRoleName(roleName);
  for (const mapping of ROLE_MAPPINGS) {
    if (mapping.pattern.test(roleName) || normalizeRoleName(mapping.pattern.source) === normalized) {
      return mapping.classType;
    }
  }

  // Try fuzzy matching
  const classKeywords: Record<ClassType, string[]> = {
    'Toái Mộng': ['toai', 'mong', 'toaimong', 'toái mộng'],
    'Cửu Linh': ['cuu', 'linh', 'cuulinh', 'cửu linh', 'culinh'],
    'Long Ngâm': ['long', 'nam', 'longnam', 'long ngâm', 'ngam'],
    'Thiết Y': ['thiet', 'y', 'thietey', 'thiết y', 'thiey'],
    'Tố Vấn': ['to', 'van', 'tovan', 'tố vấn', 'tovan'],
    'Thần Tương': ['than', 'tuong', 'thantuong', 'thần tương'],
    'Huyết Hà': ['huyet', 'ha', 'huyetha', 'huyết hà', 'huyetha'],
  };

  for (const [classType, keywords] of Object.entries(classKeywords)) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        return classType as ClassType;
      }
    }
  }

  return null;
}

export interface RoleMappingResult {
  roleName: string;
  classType: ClassType;
  matched: boolean;
}

export function mapRolesToClasses(roleNames: string[]): RoleMappingResult[] {
  return roleNames.map(name => {
    const classType = findClassTypeForRole(name);
    return {
      roleName: name,
      classType: classType ?? 'Toái Mộng', // fallback
      matched: classType !== null,
    };
  });
}
