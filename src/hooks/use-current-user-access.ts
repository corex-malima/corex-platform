"use client";

import useSWR from "swr";

import { fetchJson } from "@/lib/fetch-json";
import type { PermissionOverride, RoleCode } from "@/lib/access-control";

export type CurrentUserAccess = {
  ok: true;
  userId: number;
  username: string;
  roleCode: RoleCode;
  isSuperadmin: boolean;
  allowedResources: string[];
  permissionOverrides: PermissionOverride[];
  authenticatedAt: string;
};

const authMeFetcher = (url: string) =>
  fetchJson<CurrentUserAccess>(url, "No se pudo obtener la sesion actual.");

export function useCurrentUserAccess() {
  return useSWR("/api/auth/me?v=2", authMeFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });
}
