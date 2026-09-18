import prisma from "./db.server.js";

const MAX_ATTEMPTS = 6;

/**
 * Enqueue a job, deduped by key. Called from webhook handlers — this is the
 * ONLY thing a webhook route does (verify + write a row); all real work
 * happens in the poller so the webhook response stays fast, per Shopify's
 * webhook timeout guidance.
 */
export async function enqueueJob({ shop, type, payload, dedupeKey, delayMs = 0 }) {
  const availableAt = new Date(Date.now() + delayMs);
  try {
    if (dedupeKey) {
      // If a pending/retry job with this key already exists, just push its
      // availableAt out (coalesces bursts of inventory webhooks for the
      // same product into one job that reads the LATEST state when it runs).
      const existing = await prisma.job.findUnique({ where: { dedupeKey } });
      if (existing && ["pending", "retry"].includes(existing.status)) {
        return prisma.job.update({
          where: { id: existing.id },
          data: { availableAt, payload: JSON.stringify(payload) },
        });
      }
    }
    return await prisma.job.create({
      data: {
        shop,
        type,
        dedupeKey: dedupeKey || undefined,
        payload: JSON.stringify(payload),
        availableAt,
      },
    });
  } catch (err) {
    // Unique constraint race on dedupeKey — another request just created it.
    // That's fine, our job still gets processed.
    if (err.code === "P2002") return null;
    throw err;
  }
}

/**
 * Claim up to `limit` due jobs for processing. Uses a lockedAt timestamp
 * rather than a separate row-lock mechanism (SQLite/Prisma has no
 * SELECT ... FOR SKIP LOCKED) — safe here because this runs from a single
 * Node process's setInterval loop, never multiple workers concurrently.
 */
export async function claimDueJobs(limit = 20) {
  const due = await prisma.job.findMany({
    where: { status: { in: ["pending", "retry"] }, availableAt: { lte: new Date() } },
    orderBy: { availableAt: "asc" },
    take: limit,
  });
  const claimed = [];
  for (const job of due) {
    const result = await prisma.job.updateMany({
      where: { id: job.id, status: job.status },
      data: { status: "processing", lockedAt: new Date() },
    });
    if (result.count === 1) claimed.push(job);
  }
  return claimed;
}

export async function markJobSucceeded(jobId) {
  return prisma.job.update({
    where: { id: jobId },
    data: { status: "succeeded", processedAt: new Date(), lastError: null },
  });
}

export async function markJobFailed(jobId, error, { retryable = true } = {}) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  const attempts = (job?.attempts || 0) + 1;
  const message = error instanceof Error ? error.message : String(error);

  if (!retryable || attempts >= MAX_ATTEMPTS) {
    return prisma.job.update({
      where: { id: jobId },
      data: { status: "failed", attempts, lastError: message, processedAt: new Date() },
    });
  }

  // Exponential backoff with jitter: 30s * 2^attempts, capped, plus 0-30s jitter.
  const backoffMs = Math.min(30_000 * 2 ** attempts, 30 * 60_000) + Math.random() * 30_000;
  return prisma.job.update({
    where: { id: jobId },
    data: {
      status: "retry",
      attempts,
      lastError: message,
      availableAt: new Date(Date.now() + backoffMs),
    },
  });
}

export async function cancelJobsForShop(shop) {
  return prisma.job.updateMany({
    where: { shop, status: { in: ["pending", "retry", "processing"] } },
    data: { status: "cancelled" },
  });
}
