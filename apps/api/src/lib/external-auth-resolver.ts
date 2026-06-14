import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import type { FastifyBaseLogger } from "fastify";
import { env } from "../config.js";
import { db, schema } from "../db/index.js";
import { auditLog, sanitizeAuditInput } from "./audit.js";

// ── Types ─────────────────────────────────────────────────────────

export interface ExternalAuthParams {
  provider: string; // "oidc" or "saml"
  externalId: string; // OIDC sub or SAML NameID
  email?: string;
  emailVerified?: boolean;
  username: string; // derived/sanitized username
  autoCreate: boolean;
  autoLink: boolean;
  defaultRole: string;
  logger: FastifyBaseLogger;
  ip: string;
  requestId: string;
}

export interface ExternalAuthResult {
  user: { id: string; username: string; role: string; team: string } | null;
  action: "matched" | "linked" | "created" | "denied";
  deniedReason?: "user_not_authorized" | "user_limit_reached";
}

// ── Username helpers ──────────────────────────────────────────────

export function sanitizeUsername(raw: string): string {
  let sanitized = raw
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^[_.-]+|[_.-]+$/g, "");

  // Enforce 3-50 char limit (truncate to 46 to leave room for collision suffix)
  if (sanitized.length > 46) {
    sanitized = sanitized.slice(0, 46);
  }
  if (sanitized.length < 3) {
    sanitized = sanitized.padEnd(3, "_");
  }

  return sanitized;
}

export async function findUniqueUsername(base: string): Promise<string> {
  const [existing] = await db
    .select({ username: schema.users.username })
    .from(schema.users)
    .where(eq(schema.users.username, base));

  if (!existing) return base;

  for (let i = 2; i <= 1000; i++) {
    const candidate = `${base}_${i}`;
    const [taken] = await db
      .select({ username: schema.users.username })
      .from(schema.users)
      .where(eq(schema.users.username, candidate));
    if (!taken) return candidate;
  }

  // Extremely unlikely fallback
  return `${base}_${Date.now()}`;
}

// ── Resolver ─────────────────────────────────────────────────────

export async function resolveExternalUser(params: ExternalAuthParams): Promise<ExternalAuthResult> {
  const {
    provider,
    externalId,
    email,
    emailVerified,
    username,
    autoCreate,
    autoLink,
    defaultRole,
    logger,
    ip,
    requestId,
  } = params;

  const providerUpper = provider.toUpperCase();

  const audit = (event: string, details: Record<string, unknown> = {}) =>
    auditLog(logger, event, details, ip, requestId);

  // 1. Match by externalId
  const [existingByExtId] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.externalId, externalId))
    .limit(1);

  if (existingByExtId) {
    // Update email if changed
    if (email && email !== existingByExtId.email) {
      await db
        .update(schema.users)
        .set({ email, updatedAt: new Date() })
        .where(eq(schema.users.id, existingByExtId.id));
    }
    return {
      user: {
        id: existingByExtId.id,
        username: existingByExtId.username,
        role: existingByExtId.role,
        team: existingByExtId.team,
      },
      action: "matched",
    };
  }

  // 2. Auto-link by email
  if (autoLink && email && emailVerified) {
    const [existingByEmail] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (existingByEmail) {
      await db
        .update(schema.users)
        .set({
          externalId,
          authProvider: provider,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, existingByEmail.id));

      await audit(`${providerUpper}_USER_LINKED`, {
        userId: existingByEmail.id,
        username: existingByEmail.username,
        email,
      });

      return {
        user: {
          id: existingByEmail.id,
          username: existingByEmail.username,
          role: existingByEmail.role,
          team: existingByEmail.team,
        },
        action: "linked",
      };
    }
  }

  // 3. Auto-create
  if (autoCreate) {
    // Check user limit
    if (env.MAX_USERS > 0) {
      const [countResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(schema.users);
      if (countResult && countResult.count >= env.MAX_USERS) {
        logger.warn(`${provider} auto-create blocked: user limit reached`);
        return { user: null, action: "denied", deniedReason: "user_limit_reached" };
      }
    }

    const uniqueUsername = await findUniqueUsername(username);
    const newUserId = randomUUID();

    // Look up the default team
    const [defaultTeam] = await db
      .select()
      .from(schema.teams)
      .where(eq(schema.teams.name, "Default"));
    const teamId = defaultTeam?.id ?? "default-team-00000000";

    await db.insert(schema.users).values({
      id: newUserId,
      username: uniqueUsername,
      passwordHash: null,
      role: defaultRole,
      team: teamId,
      mustChangePassword: false,
      authProvider: provider,
      externalId,
      email: email ?? null,
    });

    await audit(`${providerUpper}_USER_CREATED`, {
      userId: newUserId,
      username: uniqueUsername,
      email,
      role: defaultRole,
    });

    return {
      user: {
        id: newUserId,
        username: uniqueUsername,
        role: defaultRole,
        team: teamId,
      },
      action: "created",
    };
  }

  // 4. Denied: no matching user, auto-link did not match, auto-create disabled
  logger.warn({ externalId, email }, `${provider} user not authorized`);
  await audit(`${providerUpper}_LOGIN_FAILED`, {
    reason: "user_not_authorized",
    externalId: sanitizeAuditInput(String(externalId)),
  });

  return { user: null, action: "denied", deniedReason: "user_not_authorized" };
}
