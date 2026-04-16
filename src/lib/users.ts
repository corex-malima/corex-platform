import bcrypt from "bcryptjs";
import type { PoolClient } from "pg";

import {
  type PermissionOverride,
  type RoleCode,
  normalizeRoleCode,
  resolveAllowedResources,
  sanitizePermissionOverrides,
} from "@/lib/access-control";
import { getPool, query } from "@/lib/db";

export type User = {
  id: number;
  username: string;
  isActive: boolean;
  roleCode: RoleCode;
  createdAt: string;
  updatedAt: string;
  allowedResources: string[];
  permissionOverrides: PermissionOverride[];
};

type UserRow = {
  id: number;
  username: string;
  is_active: boolean;
  role_code: string | null;
  created_at: string;
  updated_at: string;
};

type PermissionRow = {
  user_id: number;
  resource_key: string;
  can_view: boolean;
};

export type CreateUserInput = {
  username: string;
  password: string;
  isActive?: boolean;
  roleCode?: RoleCode;
  permissionOverrides?: PermissionOverride[];
};

export type UpdateUserInput = {
  username?: string;
  password?: string;
  isActive?: boolean;
  roleCode?: RoleCode;
  permissionOverrides?: PermissionOverride[];
};

function mapUser(row: UserRow, permissionOverrides: PermissionOverride[] = []): User {
  const roleCode = normalizeRoleCode(row.role_code);
  const overrides = sanitizePermissionOverrides(permissionOverrides);
  return {
    id: row.id,
    username: row.username,
    isActive: row.is_active,
    roleCode,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    allowedResources: resolveAllowedResources(roleCode, overrides),
    permissionOverrides: overrides,
  };
}

function groupPermissionRows(rows: PermissionRow[]) {
  const grouped = new Map<number, PermissionOverride[]>();

  for (const row of rows) {
    const current = grouped.get(row.user_id) ?? [];
    current.push({ resourceKey: row.resource_key, canView: row.can_view });
    grouped.set(row.user_id, current);
  }

  return grouped;
}

async function listPermissionRows(userIds?: number[]) {
  if (userIds && userIds.length === 0) return [] as PermissionRow[];

  const values: unknown[] = [];
  let text = "SELECT user_id, resource_key, can_view FROM public.user_screen_permissions";

  if (userIds?.length) {
    values.push(userIds);
    text += " WHERE user_id = ANY($1::int[])";
  }

  text += " ORDER BY user_id, resource_key";
  const result = await query<PermissionRow>(text, values);
  return result.rows;
}

async function replaceUserPermissionOverrides(
  client: PoolClient,
  userId: number,
  overrides: PermissionOverride[],
) {
  const sanitized = sanitizePermissionOverrides(overrides);

  await client.query("DELETE FROM public.user_screen_permissions WHERE user_id = $1", [userId]);

  for (const override of sanitized) {
    await client.query(
      `INSERT INTO public.user_screen_permissions (user_id, resource_key, can_view)
       VALUES ($1, $2, $3)`,
      [userId, override.resourceKey, override.canView],
    );
  }
}

export async function listUsers(): Promise<User[]> {
  const result = await query<UserRow>(
    "SELECT id, username, is_active, role_code, created_at, updated_at FROM public.users ORDER BY created_at DESC",
    [],
  );
  const permissionRows = await listPermissionRows(result.rows.map((row) => row.id));
  const byUser = groupPermissionRows(permissionRows);

  return result.rows.map((row) => mapUser(row, byUser.get(row.id) ?? []));
}

export async function getUserById(id: number): Promise<User | null> {
  const result = await query<UserRow>(
    "SELECT id, username, is_active, role_code, created_at, updated_at FROM public.users WHERE id = $1",
    [id],
  );
  if (result.rows.length === 0) return null;

  const permissionRows = await listPermissionRows([id]);
  return mapUser(result.rows[0], permissionRows.map((row) => ({ resourceKey: row.resource_key, canView: row.can_view })));
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const normalizedUsername = username.trim().toLowerCase();
  const result = await query<UserRow>(
    "SELECT id, username, is_active, role_code, created_at, updated_at FROM public.users WHERE username = $1",
    [normalizedUsername],
  );
  if (result.rows.length === 0) return null;

  const user = result.rows[0];
  const permissionRows = await listPermissionRows([user.id]);
  return mapUser(user, permissionRows.map((row) => ({ resourceKey: row.resource_key, canView: row.can_view })));
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const pool = getPool();
  if (!pool) throw new Error("Database is not configured.");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const passwordHash = await bcrypt.hash(input.password, 10);
    const isActive = input.isActive ?? true;
    const roleCode = normalizeRoleCode(input.roleCode);

    const insertResult = await client.query<UserRow>(
      `INSERT INTO public.users (username, password_hash, is_active, role_code)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, is_active, role_code, created_at, updated_at`,
      [input.username.trim().toLowerCase(), passwordHash, isActive, roleCode],
    );

    const user = insertResult.rows[0];
    await replaceUserPermissionOverrides(client, user.id, input.permissionOverrides ?? []);

    await client.query("COMMIT");
    return (await getUserById(user.id))!;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateUser(id: number, input: UpdateUserInput): Promise<User | null> {
  const pool = getPool();
  if (!pool) throw new Error("Database is not configured.");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const setClauses: string[] = ["updated_at = NOW()"];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.username !== undefined) {
      setClauses.push(`username = $${paramIndex++}`);
      values.push(input.username.trim().toLowerCase());
    }
    if (input.password !== undefined) {
      const hash = await bcrypt.hash(input.password, 10);
      setClauses.push(`password_hash = $${paramIndex++}`);
      values.push(hash);
    }
    if (input.isActive !== undefined) {
      setClauses.push(`is_active = $${paramIndex++}`);
      values.push(input.isActive);
    }
    if (input.roleCode !== undefined) {
      setClauses.push(`role_code = $${paramIndex++}`);
      values.push(normalizeRoleCode(input.roleCode));
    }

    values.push(id);

    const result = await client.query<UserRow>(
      `UPDATE public.users SET ${setClauses.join(", ")} WHERE id = $${paramIndex}
       RETURNING id, username, is_active, role_code, created_at, updated_at`,
      values,
    );
    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    if (input.permissionOverrides !== undefined) {
      await replaceUserPermissionOverrides(client, id, input.permissionOverrides);
    }

    await client.query("COMMIT");
    return await getUserById(id);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteUser(id: number): Promise<boolean> {
  const result = await query(
    "DELETE FROM public.users WHERE id = $1",
    [id],
  );
  return (result.rowCount ?? 0) > 0;
}
