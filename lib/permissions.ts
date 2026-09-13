/**
 * Pure RBAC helpers — safe to import from both server code and client
 * components (no `next/headers` / server-only imports here).
 */

export function hasRole(user: { roles: string[] }, code: string): boolean {
  return user.roles.includes(code);
}

export function hasPermission(user: { roles: string[]; permissions: string[] }, code: string): boolean {
  // The admin role is an implicit full-access backstop.
  return user.roles.includes('admin') || user.permissions.includes(code);
}

/** Canonical permission code catalog — keep in sync with the seed data. */
export const PERMISSION_CODES = {
  consoleView: 'console:view',
  apikeyManage: 'apikey:manage',
  usageView: 'usage:view',
  billingManage: 'billing:manage',
  accountManage: 'account:manage',
  adminView: 'admin:view',
  modelView: 'model:view',
  modelManage: 'model:manage',
  planView: 'plan:view',
  planManage: 'plan:manage',
  userView: 'user:view',
  userManage: 'user:manage',
  roleView: 'role:view',
  roleManage: 'role:manage',
  usageViewAll: 'usage:view_all',
  settingView: 'setting:view',
  settingManage: 'setting:manage',
} as const;
