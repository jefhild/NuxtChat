import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loadEnvFile = (envPath) => {
  try {
    const raw = fs.readFileSync(envPath, "utf8");
    raw.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const idx = trimmed.indexOf("=");
      if (idx === -1) return;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^"|"$/g, "");
      if (!process.env[key]) process.env[key] = val;
    });
  } catch {
    // ignore missing .env
  }
};

const normalizeLocale = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .split("-")[0];

const args = process.argv.slice(2);
const getArg = (name, fallback = "") => {
  const found = args.find((arg) => arg.startsWith(`${name}=`));
  if (!found) return fallback;
  return found.slice(name.length + 1);
};
const hasFlag = (name) => args.includes(name);

const limit = Math.max(Number(getArg("--limit", "100")) || 100, 1);
const localesArg = getArg("--locales", "en,fr,ru,zh");
const baseUrlArg = getArg("--base-url", "");
const dryRun = hasFlag("--dry-run");
const onlySlug = getArg("--only-slug", "").trim().toLowerCase();
const onlyId = getArg("--only-id", "").trim();
const startAfter = getArg("--start-after", "").trim();
const delayMs = Math.max(Number(getArg("--delay-ms", "500")) || 0, 0);

const targetLocales = Array.from(
  new Set(
    localesArg
      .split(",")
      .map((entry) => normalizeLocale(entry))
      .filter(Boolean)
  )
);

if (!targetLocales.length) {
  console.error("No target locales found. Use --locales=en,fr,ru,zh");
  process.exit(1);
}

loadEnvFile(path.resolve(__dirname, "..", ".env"));

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const baseUrl = baseUrlArg || process.env.SITE_URL || "http://localhost:3000";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const fetchPublishedArticles = async () => {
  const rows = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("articles")
      .select(
        `
        id,
        slug,
        created_at,
        original_language_code,
        article_translations(locale)
      `
      )
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;
    if (!data?.length) break;

    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
};

const buildJobs = (articles) => {
  const jobs = [];

  for (const article of articles) {
    const sourceLocale = normalizeLocale(article?.original_language_code) || "en";
    const existing = new Set(
      (Array.isArray(article?.article_translations)
        ? article.article_translations
        : []
      )
        .map((row) => normalizeLocale(row?.locale))
        .filter(Boolean)
    );

    const missing = targetLocales.filter(
      (locale) => locale !== sourceLocale && !existing.has(locale)
    );
    if (!missing.length) continue;

    jobs.push({
      id: String(article.id),
      slug: String(article.slug || ""),
      sourceLocale,
      missing,
      createdAt: article.created_at || null,
    });
  }

  return jobs;
};

const callTranslateEndpoint = async (job) => {
  const payload = {
    articleId: job.id,
    targetLocales: job.missing,
    sourceLocale: job.sourceLocale,
    overwrite: false,
  };

  const res = await fetch(`${baseUrl}/api/admin/articles/translate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  if (!res.ok || !json?.success) {
    const message = json?.error || text || `HTTP ${res.status}`;
    throw new Error(message);
  }

  return {
    translated: Array.isArray(json.translated) ? json.translated : [],
    skipped: Array.isArray(json.skipped) ? json.skipped : [],
  };
};

const run = async () => {
  const allArticles = await fetchPublishedArticles();
  let jobs = buildJobs(allArticles);

  if (onlyId) {
    jobs = jobs.filter((job) => job.id === onlyId);
  }
  if (onlySlug) {
    jobs = jobs.filter((job) => job.slug.toLowerCase() === onlySlug);
  }
  if (startAfter) {
    const idx = jobs.findIndex((job) => job.id === startAfter);
    if (idx >= 0) jobs = jobs.slice(idx + 1);
  }

  const selectedJobs = jobs.slice(0, limit);

  console.log(
    `Found ${jobs.length} articles with missing translations for [${targetLocales.join(
      ", "
    )}].`
  );
  console.log(`Processing ${selectedJobs.length} article(s). dryRun=${dryRun}`);

  if (!selectedJobs.length) return;

  if (dryRun) {
    selectedJobs.forEach((job, idx) => {
      console.log(
        `${idx + 1}. article=${job.id} slug=${job.slug} source=${
          job.sourceLocale
        } missing=[${job.missing.join(",")}] created_at=${job.createdAt || ""}`
      );
    });
    return;
  }

  let okCount = 0;
  let failCount = 0;
  let translatedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < selectedJobs.length; i += 1) {
    const job = selectedJobs[i];
    const prefix = `[${i + 1}/${selectedJobs.length}] article=${job.id} slug=${
      job.slug
    }`;

    try {
      const result = await callTranslateEndpoint(job);
      okCount += 1;
      translatedCount += result.translated.length;
      skippedCount += result.skipped.length;

      console.log(
        `${prefix} ok translated=[${result.translated.join(
          ","
        )}] skipped=[${result.skipped.join(",")}]`
      );
    } catch (err) {
      failCount += 1;
      console.error(`${prefix} fail ${err?.message || err}`);
    }

    if (delayMs > 0 && i < selectedJobs.length - 1) {
      await sleep(delayMs);
    }
  }

  console.log("-----");
  console.log(`articles_ok=${okCount}`);
  console.log(`articles_failed=${failCount}`);
  console.log(`locales_translated=${translatedCount}`);
  console.log(`locales_skipped=${skippedCount}`);
  if (selectedJobs.length) {
    console.log(
      `resume_after_article_id=${selectedJobs[selectedJobs.length - 1].id}`
    );
  }
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
