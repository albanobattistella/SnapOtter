import type { Permission, Role } from "@snapotter/shared";
import { eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db, schema } from "./db/index.js";
import { type AuthUser, getAuthUser } from "./plugins/auth.js";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    "tools:use",
    "files:own",
    "files:all",
    "apikeys:own",
    "apikeys:all",
    "pipelines:own",
    "pipelines:all",
    "settings:read",
    "settings:write",
    "users:manage",
    "teams:manage",
    "features:manage",
    "system:health",
    "audit:read",
    "compliance:manage",
    "webhooks:manage",
    "security:manage",
  ],
  editor: [
    "tools:use",
    "files:own",
    "files:all",
    "apikeys:own",
    "pipelines:own",
    "pipelines:all",
    "settings:read",
  ],
  user: ["tools:use", "files:own", "apikeys:own", "pipelines:own", "settings:read"],
};

export async function getPermissions(role: Role | string): Promise<Permission[]> {
  if (typeof role !== "string" || isDisabledRole(role)) return [];
  if (role in ROLE_PERMISSIONS) {
    return ROLE_PERMISSIONS[role as Role];
  }
  try {
    const [customRole] = await db
      .select()
      .from(schema.roles)
      .where(eq(schema.roles.name, role as string));
    if (customRole) {
      return customRole.permissions as Permission[];
    }
  } catch {
    // DB not yet available during early startup
  }
  return [];
}

export async function hasPermission(role: Role | string, permission: Permission): Promise<boolean> {
  return (await getPermissions(role)).includes(permission);
}

export async function hasEffectivePermission(
  user: AuthUser,
  permission: Permission,
): Promise<boolean> {
  if (!(await hasPermission(user.role, permission))) return false;
  if (user.apiKeyPermissions) {
    return user.apiKeyPermissions.includes(permission);
  }
  return true;
}

export function isDisabledRole(role: string | null | undefined): boolean {
  return role === "disabled" || role?.startsWith("disabled:") === true;
}

export async function getEffectivePermissions(user: AuthUser): Promise<Permission[]> {
  const rolePermissions = await getPermissions(user.role);
  if (!user.apiKeyPermissions) return rolePermissions;

  const scoped = new Set(user.apiKeyPermissions);
  return rolePermissions.filter((permission) => scoped.has(permission));
}

export async function permissionsNotHeldBy(
  user: AuthUser,
  requestedPermissions: string[],
): Promise<string[]> {
  const effectivePermissions = new Set(await getEffectivePermissions(user));
  return requestedPermissions.filter(
    (permission) => !effectivePermissions.has(permission as Permission),
  );
}

export async function canAssignRole(actor: AuthUser, targetRole: string): Promise<boolean> {
  if (isDisabledRole(targetRole)) return false;
  const targetPermissions = await getPermissions(targetRole);
  if (targetPermissions.length === 0) return false;

  const actorPermissions = new Set(await getEffectivePermissions(actor));
  return targetPermissions.every((permission) => actorPermissions.has(permission));
}

export function requirePermission(
  permission: Permission,
): (request: FastifyRequest, reply: FastifyReply) => Promise<AuthUser | null> {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getAuthUser(request);
    if (!user) {
      reply.status(401).send({ error: "Authentication required", code: "AUTH_REQUIRED" });
      return null;
    }
    if (!(await hasEffectivePermission(user, permission))) {
      reply.status(403).send({ error: "Insufficient permissions", code: "FORBIDDEN" });
      return null;
    }
    return user;
  };
}

export async function hasToolAccess(role: string, toolId: string): Promise<boolean> {
  if (isDisabledRole(role)) return false;

  // Built-in roles have no tool restrictions
  if (role in ROLE_PERMISSIONS) return true;

  try {
    const [roleRow] = await db
      .select({ toolPermissions: schema.roles.toolPermissions })
      .from(schema.roles)
      .where(eq(schema.roles.name, role))
      .limit(1);

    // Unknown custom roles do not get implicit access. Known custom roles with
    // no per-tool restriction keep the historical "all tools" behavior.
    if (!roleRow) return false;
    if (!roleRow.toolPermissions) return true;

    const tp = roleRow.toolPermissions;

    if (tp.mode === "category") {
      const { TOOLS } = await import("@snapotter/shared");
      const tool = TOOLS.find((t) => t.id === toolId);
      if (!tool) return false;
      return tp.allowed.includes(tool.modality ?? tool.category);
    }

    if (tp.mode === "tool") {
      // Per-tool mode requires enterprise license
      let isEnterprise = false;
      try {
        const { isFeatureEnabled } = await import("@snapotter/enterprise");
        isEnterprise = isFeatureEnabled("per_tool_permissions");
      } catch {}

      if (!isEnterprise) return true; // Graceful degradation -- no enterprise = allow all
      return tp.allowed.includes(toolId);
    }

    return true; // Unknown mode = allow
  } catch {
    return false;
  }
}

export async function hasEffectiveToolAccess(user: AuthUser, toolId: string): Promise<boolean> {
  if (!(await hasEffectivePermission(user, "tools:use"))) return false;
  return hasToolAccess(user.role, toolId);
}

export async function requireToolAccess(
  request: FastifyRequest,
  reply: FastifyReply,
  toolId: string,
): Promise<AuthUser | null> {
  const user = getAuthUser(request);
  if (!user) {
    reply.status(401).send({ error: "Authentication required", code: "AUTH_REQUIRED" });
    return null;
  }

  if (!(await hasEffectiveToolAccess(user, toolId))) {
    reply.status(403).send({ error: "You don't have permission to use this tool" });
    return null;
  }

  return user;
}

export async function requireOwnershipOrPermission(
  request: FastifyRequest,
  reply: FastifyReply,
  resourceUserId: string | null,
  allPermission: Permission,
) {
  const user = getAuthUser(request);
  if (!user) {
    reply.status(401).send({ error: "Authentication required", code: "AUTH_REQUIRED" });
    return null;
  }
  if (resourceUserId !== user.id && !(await hasEffectivePermission(user, allPermission))) {
    return null;
  }
  return user;
}
