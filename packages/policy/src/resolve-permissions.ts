import { ROLE_PERMISSIONS, ROLE_ALIASES } from "./role-mapping.js";
import { Permission } from "./permissions.js";

/**
 * Resolves the effective permissions from a list of user roles or memberships.
 */
export function resolvePermissions(roles: string[]): Permission[] {
  const permissions = new Set<Permission>();

  for (const rawRole of roles) {
    // Normalize role name
    const normalizedRole = rawRole.toLowerCase();
    
    // Check aliases
    const coreRole = ROLE_ALIASES[normalizedRole] || normalizedRole;
    
    // Gather permissions
    const granted = ROLE_PERMISSIONS[coreRole];
    if (granted) {
      for (const p of granted) {
        permissions.add(p);
      }
    }
  }

  return Array.from(permissions);
}
