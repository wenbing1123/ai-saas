import { and, asc, eq, inArray, notInArray, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import {
  users,
  roles,
  permissions,
  userRoles,
  rolePermissions,
} from '@/lib/db/schema';
import { mapRole, mapPermission } from './mappers';
import type { Permission, Role, RoleWithPermissions } from '@/lib/types';
import { RoleStatus } from '@/lib/db/enums';

const liveUser = eq(users.deleted, 0);
const liveRole = eq(roles.deleted, 0);
const livePermission = eq(permissions.deleted, 0);
const liveUserRole = eq(userRoles.deleted, 0);
const liveRolePermission = eq(rolePermissions.deleted, 0);

/** Active role codes assigned to a user (e.g. ['admin', 'user']). */
export async function getRoleCodesByUser(userId: string): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ code: roles.code })
    .from(userRoles)
    .innerJoin(roles, and(eq(userRoles.roleId, roles.id), liveRole))
    .where(and(eq(userRoles.userId, userId), liveUserRole, eq(roles.status, RoleStatus.Active)));
  return rows.map((r) => r.code);
}

/**
 * Flat permission code list for a user — the union of every permission
 * attached to every active role the user holds.
 */
export async function getPermissionCodesByUser(userId: string): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ code: permissions.code })
    .from(userRoles)
    .innerJoin(roles, and(eq(userRoles.roleId, roles.id), liveRole))
    .innerJoin(rolePermissions, and(eq(rolePermissions.roleId, roles.id), liveRolePermission))
    .innerJoin(permissions, and(eq(rolePermissions.permissionId, permissions.id), livePermission))
    .where(and(eq(userRoles.userId, userId), liveUserRole, eq(roles.status, RoleStatus.Active)));
  return [...new Set(rows.map((r) => r.code))];
}

export async function listAllPermissions(): Promise<Permission[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(permissions)
    .where(livePermission)
    .orderBy(asc(permissions.module), asc(permissions.sortOrder), asc(permissions.code));
  return rows.map(mapPermission);
}

export async function listRoles(): Promise<Role[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(roles)
    .where(liveRole)
    .orderBy(asc(roles.sortOrder), asc(roles.code));
  return rows.map(mapRole);
}

/** All roles with their granted permissions — used by the role admin UI. */
export async function listRolesWithPermissions(): Promise<RoleWithPermissions[]> {
  const db = getDb();
  const roleRows = await db
    .select()
    .from(roles)
    .where(liveRole)
    .orderBy(asc(roles.sortOrder), asc(roles.code));

  const links = await db
    .select({ roleId: rolePermissions.roleId, permission: permissions })
    .from(rolePermissions)
    .innerJoin(permissions, and(eq(rolePermissions.permissionId, permissions.id), livePermission))
    .where(liveRolePermission);

  const byRole = new Map<string, Permission[]>();
  for (const link of links) {
    const list = byRole.get(link.roleId) ?? [];
    list.push(mapPermission(link.permission));
    byRole.set(link.roleId, list);
  }

  return roleRows.map((row) => ({
    ...mapRole(row),
    permissions: (byRole.get(row.id) ?? []).sort((a, b) =>
      a.module === b.module ? a.sortOrder - b.sortOrder : a.module.localeCompare(b.module),
    ),
  }));
}

export async function getRoleById(roleId: string): Promise<Role | null> {
  const db = getDb();
  const rows = await db.select().from(roles).where(and(eq(roles.id, roleId), liveRole)).limit(1);
  return rows[0] ? mapRole(rows[0]) : null;
}

export async function getRoleIdByCode(code: string): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select({ id: roles.id })
    .from(roles)
    .where(and(eq(roles.code, code), liveRole))
    .limit(1);
  return rows[0]?.id ?? null;
}

/**
 * Replace a user's role set with exactly the given role codes.
 * Existing mappings are soft-deleted; missing ones are inserted.
 * Runs in a transaction so the effective set is always consistent.
 */
export async function assignUserRoles(userId: string, roleCodes: string[]): Promise<void> {
  const db = getDb();
  const codes = [...new Set(roleCodes)];
  await db.transaction(async (tx) => {
    const roleRows = await tx.select().from(roles).where(and(inArray(roles.code, codes), liveRole));
    const roleIds = roleRows.map((r) => r.id);
    if (roleIds.length !== codes.length) {
      const found = new Set(roleRows.map((r) => r.code));
      const missing = codes.filter((c) => !found.has(c));
      throw new Error(`Unknown role code(s): ${missing.join(', ')}`);
    }

    // Soft-delete mappings that should no longer be active.
    const removeWhere =
      roleIds.length > 0
        ? and(eq(userRoles.userId, userId), liveUserRole, notInArray(userRoles.roleId, roleIds))
        : and(eq(userRoles.userId, userId), liveUserRole);
    await tx.update(userRoles).set({ deleted: 1, updatedAt: new Date() }).where(removeWhere);

    // Insert missing mappings (reactivate a previously soft-deleted row if any).
    const existing = await tx
      .select({ roleId: userRoles.roleId, deleted: userRoles.deleted })
      .from(userRoles)
      .where(eq(userRoles.userId, userId));
    const existingMap = new Map(existing.map((r) => [r.roleId, r.deleted]));
    for (const roleId of roleIds) {
      const wasDeleted = existingMap.get(roleId);
      if (wasDeleted === undefined) {
        await tx.insert(userRoles).values({ userId, roleId });
      } else if (wasDeleted === 1) {
        await tx
          .update(userRoles)
          .set({ deleted: 0, updatedAt: new Date() })
          .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));
      }
    }
  });
}

/** Add or remove a single role while preserving the user's other roles. */
export async function toggleUserRole(userId: string, roleCode: string, active: boolean): Promise<void> {
  const db = getDb();
  const roleId = await getRoleIdByCode(roleCode);
  if (!roleId) throw new Error(`Unknown role: ${roleCode}`);
  const existing = await db
    .select()
    .from(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)))
    .limit(1);

  if (existing.length === 0) {
    if (active) await db.insert(userRoles).values({ userId, roleId });
    return;
  }
  // YesNo flag: 0 = live (role active), 1 = deleted (role revoked).
  const targetDeleted = active ? 0 : 1;
  if (existing[0].deleted !== targetDeleted) {
    await db
      .update(userRoles)
      .set({ deleted: targetDeleted, updatedAt: new Date() })
      .where(eq(userRoles.id, existing[0].id));
  }
}

/**
 * Replace a role's granted permissions. Built-in roles may still be edited,
 * but the admin role should retain every permission (enforced in the action).
 */
export async function setRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
  const db = getDb();
  const ids = [...new Set(permissionIds)];
  await db.transaction(async (tx) => {
    const roleRow = await tx.select().from(roles).where(and(eq(roles.id, roleId), liveRole)).limit(1);
    if (roleRow.length === 0) throw new Error('Role not found');

    const removeWhere =
      ids.length > 0
        ? and(eq(rolePermissions.roleId, roleId), liveRolePermission, notInArray(rolePermissions.permissionId, ids))
        : and(eq(rolePermissions.roleId, roleId), liveRolePermission);
    await tx.update(rolePermissions).set({ deleted: 1, updatedAt: new Date() }).where(removeWhere);

    const existing = await tx
      .select({ permissionId: rolePermissions.permissionId, deleted: rolePermissions.deleted })
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, roleId));
    const existingMap = new Map(existing.map((r) => [r.permissionId, r.deleted]));

    for (const permissionId of ids) {
      const wasDeleted = existingMap.get(permissionId);
      if (wasDeleted === undefined) {
        await tx.insert(rolePermissions).values({ roleId, permissionId });
      } else if (wasDeleted === 1) {
        await tx
          .update(rolePermissions)
          .set({ deleted: 0, updatedAt: new Date() })
          .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permissionId)));
      }
    }
  });
}

/** Ensure at least one mapping touches the user table so callers can assume it exists. */
export async function countActiveAdmins(): Promise<number> {
  const db = getDb();
  const rows = await db.execute<{ n: number }>(sql`
    SELECT count(DISTINCT ur.user_id)::int AS n
    FROM sys_user_role ur
    JOIN sys_role r ON r.id = ur.role_id AND r.deleted = 0
    JOIN sys_user u ON u.id = ur.user_id AND u.deleted = 0
    WHERE ur.deleted = 0 AND r.code = 'admin' AND u.status = 1
  `);
  return Number(rows[0]?.n ?? 0);
}
