export function hasRequiredRole(memberRoles: string[], requiredRoles: string[]) {
  return requiredRoles.length === 0 || requiredRoles.some(roleName => memberRoles.includes(roleName));
}
