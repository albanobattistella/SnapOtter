import type { FastifyInstance } from "fastify";
import { registerAuditExport } from "./audit-export.js";
import { registerConfigRoutes } from "./config.js";
import { registerGdprRoutes } from "./gdpr.js";
import { registerIpAllowlistRoutes } from "./ip-allowlist.js";
import { registerLegalHoldRoutes } from "./legal-hold.js";
import { registerScimRoutes } from "./scim.js";
import { registerSiemRoutes } from "./siem.js";
import { registerUpgradeRoutes } from "./upgrade.js";
import { registerWebhookRoutes } from "./webhooks.js";

export async function registerEnterpriseRoutes(app: FastifyInstance) {
  await registerAuditExport(app);
  await registerConfigRoutes(app);
  await registerGdprRoutes(app);
  await registerIpAllowlistRoutes(app);
  await registerLegalHoldRoutes(app);
  await registerScimRoutes(app);
  await registerSiemRoutes(app);
  await registerUpgradeRoutes(app);
  await registerWebhookRoutes(app);
}
