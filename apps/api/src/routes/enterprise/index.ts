import type { FastifyInstance } from "fastify";
import { registerAuditExport } from "./audit-export.js";

export async function registerEnterpriseRoutes(app: FastifyInstance) {
  await registerAuditExport(app);
}
