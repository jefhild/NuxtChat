import { randomUUID } from "node:crypto";
import { translateSeoPage } from "~/server/utils/seoPageTranslation";

type TranslationJobStatus = "queued" | "running" | "completed" | "failed";

type TranslationJob = {
  id: string;
  pageId: string;
  sourceLocale: string;
  targetLocales: string[];
  overwrite: boolean;
  status: TranslationJobStatus;
  currentLocale: string | null;
  translated: string[];
  skipped: string[];
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

const jobs = new Map<string, TranslationJob>();
const jobByPageId = new Map<string, string>();

const updateJob = (jobId: string, patch: Partial<TranslationJob>) => {
  const existing = jobs.get(jobId);
  if (!existing) return null;
  const next = { ...existing, ...patch };
  jobs.set(jobId, next);
  return next;
};

const finalizeJob = (jobId: string, patch: Partial<TranslationJob>) => {
  const job = updateJob(jobId, patch);
  if (!job) return null;
  jobByPageId.delete(job.pageId);
  return job;
};

const runJob = async (jobId: string, runtimeConfig: any) => {
  const job = jobs.get(jobId);
  if (!job) return;

  updateJob(jobId, {
    status: "running",
    startedAt: new Date().toISOString(),
  });

  try {
    const result = await translateSeoPage({
      runtimeConfig,
      pageId: job.pageId,
      targetLocales: job.targetLocales,
      sourceLocale: job.sourceLocale,
      overwrite: job.overwrite,
      onProgress: (progress) => {
        updateJob(jobId, {
          status: progress.status as TranslationJobStatus,
          currentLocale: progress.currentLocale || null,
          translated: progress.completedLocales || [],
          skipped: progress.skippedLocales || [],
          error: progress.error || null,
        });
      },
    });

    finalizeJob(jobId, {
      status: "completed",
      currentLocale: null,
      translated: result.translated,
      skipped: result.skipped,
      finishedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[seo-page-translation-queue] job failed:", error);
    finalizeJob(jobId, {
      status: "failed",
      currentLocale: null,
      error: error?.statusMessage || error?.message || "Unable to translate SEO page.",
      finishedAt: new Date().toISOString(),
    });
  }
};

export const enqueueSeoPageTranslationJob = ({
  runtimeConfig,
  pageId,
  sourceLocale,
  targetLocales,
  overwrite = false,
}: {
  runtimeConfig: any;
  pageId: string;
  sourceLocale: string;
  targetLocales: string[];
  overwrite?: boolean;
}) => {
  const activeJobId = jobByPageId.get(pageId);
  if (activeJobId) {
    const activeJob = jobs.get(activeJobId);
    if (activeJob && (activeJob.status === "queued" || activeJob.status === "running")) {
      return activeJob;
    }
    jobByPageId.delete(pageId);
  }

  const jobId = randomUUID();
  const job: TranslationJob = {
    id: jobId,
    pageId,
    sourceLocale,
    targetLocales,
    overwrite,
    status: "queued",
    currentLocale: null,
    translated: [],
    skipped: [],
    error: null,
    createdAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
  };

  jobs.set(jobId, job);
  jobByPageId.set(pageId, jobId);
  setTimeout(() => {
    runJob(jobId, runtimeConfig);
  }, 0);

  return job;
};

export const getSeoPageTranslationJob = ({
  pageId,
  jobId,
}: {
  pageId?: string | null;
  jobId?: string | null;
}) => {
  if (jobId) return jobs.get(jobId) || null;
  if (!pageId) return null;
  const mappedJobId = jobByPageId.get(pageId);
  if (mappedJobId) return jobs.get(mappedJobId) || null;

  const matchingJobs = Array.from(jobs.values())
    .filter((job) => job.pageId === pageId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return matchingJobs[0] || null;
};
