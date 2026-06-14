/**
 * GDPR user data export job.
 *
 * Collects all user data (profile, files metadata, job history, audit log),
 * copies library file contents, and produces a ZIP archive stored in
 * object storage under `outputs/<jobId>/gdpr-export.zip`.
 */
import { PassThrough } from "node:stream";
import { pipeline } from "node:stream/promises";
import archiver from "archiver";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { readStoredFile } from "../lib/file-storage.js";
import { putObject } from "../lib/object-storage.js";

export async function gdprExportJob(userId: string, jobId: string): Promise<{ outputRef: string }> {
  // 1. Fetch user profile (exclude passwordHash)
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  if (!user) throw new Error(`User ${userId} not found`);

  const { passwordHash: _, ...profile } = user;

  // 2. Fetch all user's files metadata
  const files = await db.select().from(schema.userFiles).where(eq(schema.userFiles.userId, userId));

  // 3. Fetch job metadata
  const jobs = await db.select().from(schema.jobs).where(eq(schema.jobs.userId, userId));

  // 4. Fetch audit log entries where user is the actor
  const auditEntries = await db
    .select()
    .from(schema.auditLog)
    .where(eq(schema.auditLog.actorId, userId));

  // 5. Build a ZIP archive in memory via archiver
  const archive = archiver("zip", { zlib: { level: 6 } });
  const chunks: Buffer[] = [];
  const passthrough = new PassThrough();
  passthrough.on("data", (chunk: Buffer) => chunks.push(chunk));

  const pipelineDone = pipeline(archive, passthrough);

  archive.append(JSON.stringify(profile, null, 2), { name: "profile.json" });

  archive.append(
    JSON.stringify(
      files.map((f) => ({
        ...f,
        createdAt: f.createdAt?.toISOString(),
      })),
      null,
      2,
    ),
    { name: "files.json" },
  );

  archive.append(
    JSON.stringify(
      jobs.map((j) => ({
        ...j,
        createdAt: j.createdAt?.toISOString(),
        startedAt: j.startedAt?.toISOString(),
        completedAt: j.completedAt?.toISOString(),
        deleteAfter: j.deleteAfter?.toISOString(),
      })),
      null,
      2,
    ),
    { name: "jobs.json" },
  );

  archive.append(
    JSON.stringify(
      auditEntries.map((a) => ({
        ...a,
        createdAt: a.createdAt?.toISOString(),
      })),
      null,
      2,
    ),
    { name: "audit-log.json" },
  );

  // 6. Copy library file contents into the ZIP
  for (const file of files) {
    try {
      const buffer = await readStoredFile(file.storedName);
      archive.append(buffer, {
        name: `library-files/${file.id}_${file.originalName}`,
      });
    } catch {
      // File may have been cleaned up; skip silently
    }
  }

  await archive.finalize();
  await pipelineDone;

  // 7. Write ZIP to object storage
  const zipBuffer = Buffer.concat(chunks);
  const outputRef = `outputs/${jobId}/gdpr-export.zip`;
  await putObject(outputRef, zipBuffer);

  return { outputRef };
}
