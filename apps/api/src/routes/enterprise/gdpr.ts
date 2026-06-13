import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { db, schema } from "../../db/index.js";
import { getQueue } from "../../jobs/queues.js";
import { SYSTEM_JOBS } from "../../jobs/system-jobs.js";
import { auditFromRequest } from "../../lib/audit.js";
import { requirePermission } from "../../permissions.js";

export async function registerGdprRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/v1/enterprise/users/:id/export -- initiate GDPR data export
  app.post(
    "/api/v1/enterprise/users/:id/export",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = await requirePermission("compliance:manage")(request, reply);
      if (!user) return;

      // Enterprise feature gate
      let featureEnabled = false;
      try {
        const { isFeatureEnabled } = await import("@snapotter/enterprise");
        featureEnabled = isFeatureEnabled("gdpr_lifecycle");
      } catch {
        // Enterprise package not available
      }
      if (!featureEnabled) {
        return reply.status(403).send({
          error: "GDPR data export requires an enterprise license with the gdpr_lifecycle feature",
        });
      }

      const targetUserId = request.params.id;

      // Validate the target user exists
      const [targetUser] = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.id, targetUserId));
      if (!targetUser) {
        return reply.status(404).send({ error: "User not found" });
      }

      // Create a durable job row
      const jobId = randomUUID();
      await db.insert(schema.jobs).values({
        id: jobId,
        userId: targetUserId,
        toolId: "gdpr-export",
        pool: "system",
        type: "system",
        status: "queued",
      });

      // Enqueue the system job
      const q = getQueue("system");
      await q.add(SYSTEM_JOBS.gdprExport, { userId: targetUserId, jobId } as never, { jobId });

      await auditFromRequest(request)("GDPR_EXPORT_INITIATED", {
        adminId: user.id,
        username: user.username,
        targetUserId,
        jobId,
      });

      return reply.status(202).send({ jobId, message: "Export started" });
    },
  );

  // GET /api/v1/enterprise/users/:id/export/:jobId -- check export status
  app.get(
    "/api/v1/enterprise/users/:id/export/:jobId",
    async (
      request: FastifyRequest<{ Params: { id: string; jobId: string } }>,
      reply: FastifyReply,
    ) => {
      const user = await requirePermission("compliance:manage")(request, reply);
      if (!user) return;

      // Enterprise feature gate
      let featureEnabled = false;
      try {
        const { isFeatureEnabled } = await import("@snapotter/enterprise");
        featureEnabled = isFeatureEnabled("gdpr_lifecycle");
      } catch {
        // Enterprise package not available
      }
      if (!featureEnabled) {
        return reply.status(403).send({
          error: "GDPR data export requires an enterprise license with the gdpr_lifecycle feature",
        });
      }

      const { jobId } = request.params;

      const [job] = await db.select().from(schema.jobs).where(eq(schema.jobs.id, jobId));

      if (!job) {
        return reply.status(404).send({ error: "Export job not found" });
      }

      if (job.status === "completed") {
        const outputRef = job.outputRefs?.[0];
        const filename = outputRef?.split("/").pop() ?? "gdpr-export.zip";
        return reply.send({
          status: "completed",
          downloadUrl: `/api/v1/download/${jobId}/${encodeURIComponent(filename)}`,
        });
      }

      if (job.status === "failed") {
        const errorMsg = (job.error as { message?: string } | null)?.message ?? "Export failed";
        return reply.send({ status: "failed", error: errorMsg });
      }

      // queued or processing
      const progress = job.progress as { percent?: number; stage?: string } | null;
      return reply.send({
        status: job.status,
        progress: progress?.percent ?? 0,
      });
    },
  );

  app.log.info("Enterprise GDPR routes registered");
}
