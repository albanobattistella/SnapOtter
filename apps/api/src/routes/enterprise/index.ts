import type { FastifyInstance } from "fastify";
import { registerAuditExport } from "./audit-export.js";
import { registerSiemRoutes } from "./siem.js";

export async function registerEnterpriseRoutes(app: FastifyInstance) {
  await registerAuditExport(app);
  await registerSiemRoutes(app);
}
