import type { FastifyInstance } from "fastify";
import { registerAuditExport } from "./audit-export.js";
import { registerGdprRoutes } from "./gdpr.js";
import { registerIpAllowlistRoutes } from "./ip-allowlist.js";
import { registerLegalHoldRoutes } from "./legal-hold.js";
import { registerScimRoutes } from "./scim.js";
import { registerSiemRoutes } from "./siem.js";

export async function registerEnterpriseRoutes(app: FastifyInstance) {
  await registerAuditExport(app);
  await registerGdprRoutes(app);
  await registerIpAllowlistRoutes(app);
  await registerLegalHoldRoutes(app);
  await registerScimRoutes(app);
  await registerSiemRoutes(app);
}
