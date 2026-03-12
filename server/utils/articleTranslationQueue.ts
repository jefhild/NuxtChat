import { randomUUID } from "node:crypto";
import { translateArticle } from "~/server/utils/articleTranslation";

type TranslationJobStatus = "queued" | "running" | "completed" | "failed";

type TranslationJob = {
  id: string;
  articleId: string;
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
const jobByArticleId = new Map<string, string>();

const updateJob = (
  jobId: string,
  patch: Partial<TranslationJob>
): TranslationJob | null => {
  const existing = jobs.get(jobId);
  if (!existing) return null;
  const next = { ...existing, ...patch };
  jobs.set(jobId, next);
  return next;
};

const finalizeJob = (jobId: string, patch: Partial<TranslationJob>) => {
  const job = updateJob(jobId, patch);
  if (!job) return null;
  jobByArticleId.delete(job.articleId);
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
    const result = await translateArticle({
      runtimeConfig,
      articleId: job.articleId,
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
    console.error("[article-translation-queue] job failed:", error);
    finalizeJob(jobId, {
      status: "failed",
      currentLocale: null,
      error:
        error?.statusMessage || error?.message || "Unable to translate article.",
      finishedAt: new Date().toISOString(),
    });
  }
};

export const enqueueArticleTranslationJob = ({
  runtimeConfig,
  articleId,
  sourceLocale,
  targetLocales,
  overwrite = false,
}: {
  runtimeConfig: any;
  articleId: string;
  sourceLocale: string;
  targetLocales: string[];
  overwrite?: boolean;
}) => {
  const activeJobId = jobByArticleId.get(articleId);
  if (activeJobId) {
    const activeJob = jobs.get(activeJobId);
    if (activeJob && (activeJob.status === "queued" || activeJob.status === "running")) {
      return activeJob;
    }
    jobByArticleId.delete(articleId);
  }

  const jobId = randomUUID();
  const job: TranslationJob = {
    id: jobId,
    articleId,
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
  jobByArticleId.set(articleId, jobId);
  setTimeout(() => {
    runJob(jobId, runtimeConfig);
  }, 0);

  return job;
};

export const getArticleTranslationJob = ({
  articleId,
  jobId,
}: {
  articleId?: string | null;
  jobId?: string | null;
}) => {
  if (jobId) return jobs.get(jobId) || null;
  if (!articleId) return null;
  const mappedJobId = jobByArticleId.get(articleId);
  if (mappedJobId) return jobs.get(mappedJobId) || null;

  const matchingJobs = Array.from(jobs.values())
    .filter((job) => job.articleId === articleId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return matchingJobs[0] || null;
};
