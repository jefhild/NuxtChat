#!/usr/bin/env node

import fs from "node:fs";

const DEFAULT_BASE = "http://127.0.0.1:3000";
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

function parseArgs(argv) {
  const opts = {
    base: DEFAULT_BASE,
    file: "",
    timeoutMs: DEFAULT_TIMEOUT_MS,
    userAgent: DEFAULT_USER_AGENT,
    acceptLanguage: "",
    json: "",
    urls: [],
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--base") {
      opts.base = argv[++i] || opts.base;
      continue;
    }
    if (arg === "--file") {
      opts.file = argv[++i] || "";
      continue;
    }
    if (arg === "--timeout") {
      const parsed = Number(argv[++i]);
      if (Number.isFinite(parsed) && parsed > 0) opts.timeoutMs = parsed;
      continue;
    }
    if (arg === "--ua") {
      opts.userAgent = argv[++i] || opts.userAgent;
      continue;
    }
    if (arg === "--accept-language") {
      opts.acceptLanguage = argv[++i] || "";
      continue;
    }
    if (arg === "--json") {
      opts.json = argv[++i] || "";
      continue;
    }
    opts.urls.push(arg);
  }

  return opts;
}

function loadUrls(filePath, cliUrls) {
  const urls = [...cliUrls];
  if (filePath) {
    const raw = fs.readFileSync(filePath, "utf8");
    raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .forEach((line) => urls.push(line));
  }
  return Array.from(new Set(urls));
}

function toAbsoluteUrl(base, candidate) {
  try {
    return new URL(candidate, base).toString();
  } catch {
    return "";
  }
}

function getAttr(tag, attr) {
  const regex = new RegExp(`\\b${attr}\\s*=\\s*(['"])(.*?)\\1`, "i");
  const match = tag.match(regex);
  return match?.[2]?.trim() || "";
}

function extractCanonical(html) {
  const linkTags = html.match(/<link\b[^>]*>/gi) || [];
  for (const tag of linkTags) {
    const rel = getAttr(tag, "rel").toLowerCase();
    if (!rel) continue;
    const relParts = rel.split(/\s+/);
    if (!relParts.includes("canonical")) continue;
    const href = getAttr(tag, "href");
    if (href) return href;
  }
  return "";
}

function extractRobots(html) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of metaTags) {
    const name = getAttr(tag, "name").toLowerCase();
    if (name !== "robots") continue;
    const content = getAttr(tag, "content");
    if (content) return content;
  }
  return "";
}

function extractHreflangCount(html) {
  const linkTags = html.match(/<link\b[^>]*>/gi) || [];
  let count = 0;
  for (const tag of linkTags) {
    const rel = getAttr(tag, "rel").toLowerCase();
    if (!rel.includes("alternate")) continue;
    if (getAttr(tag, "hreflang")) count += 1;
  }
  return count;
}

async function fetchAudit(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  const headers = { "user-agent": options.userAgent };
  if (options.acceptLanguage) headers["accept-language"] = options.acceptLanguage;

  try {
    const response = await fetch(url, {
      headers,
      redirect: "follow",
      signal: controller.signal,
    });
    const finalUrl = response.url || url;
    const contentType = String(response.headers.get("content-type") || "");
    const robotsHeader = String(response.headers.get("x-robots-tag") || "");
    const isHtml = contentType.includes("text/html");
    const html = isHtml ? await response.text() : "";
    const canonical = isHtml ? extractCanonical(html) : "";
    const robotsMeta = isHtml ? extractRobots(html) : "";
    const hreflangCount = isHtml ? extractHreflangCount(html) : 0;

    const canonicalAbs = canonical ? toAbsoluteUrl(finalUrl, canonical) : "";
    const noindexSignal = `${robotsMeta},${robotsHeader}`.toLowerCase().includes(
      "noindex"
    );

    let canonicalMismatch = false;
    if (canonicalAbs) {
      try {
        canonicalMismatch =
          new URL(canonicalAbs).pathname !== new URL(finalUrl).pathname;
      } catch {
        canonicalMismatch = false;
      }
    }

    return {
      url,
      finalUrl,
      status: response.status,
      contentType,
      robotsMeta,
      robotsHeader,
      canonical: canonicalAbs || canonical,
      hreflangCount,
      html: isHtml,
      noindexSignal,
      canonicalMismatch,
      ok:
        response.status === 200 &&
        isHtml &&
        !noindexSignal &&
        Boolean(canonicalAbs || canonical),
    };
  } catch (error) {
    return {
      url,
      finalUrl: "",
      status: 0,
      contentType: "",
      robotsMeta: "",
      robotsHeader: "",
      canonical: "",
      hreflangCount: 0,
      html: false,
      noindexSignal: false,
      canonicalMismatch: false,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function printResults(results) {
  console.log(
    [
      "url",
      "status",
      "ok",
      "noindex",
      "canonical_mismatch",
      "hreflang_count",
      "final_url",
      "canonical",
    ].join("\t")
  );
  for (const row of results) {
    console.log(
      [
        row.url,
        row.status,
        row.ok ? "yes" : "no",
        row.noindexSignal ? "yes" : "no",
        row.canonicalMismatch ? "yes" : "no",
        row.hreflangCount,
        row.finalUrl,
        row.canonical,
      ].join("\t")
    );
    if (row.error) {
      console.log(`# error\t${row.url}\t${row.error}`);
    }
  }

  const totals = {
    total: results.length,
    ok: results.filter((r) => r.ok).length,
    noindex: results.filter((r) => r.noindexSignal).length,
    canonicalMismatch: results.filter((r) => r.canonicalMismatch).length,
    non200: results.filter((r) => r.status && r.status !== 200).length,
    nonHtml: results.filter((r) => !r.html).length,
    failed: results.filter((r) => r.status === 0).length,
  };
  console.log("");
  console.log(`Summary: ${JSON.stringify(totals)}`);
}

async function main() {
  const opts = parseArgs(process.argv);
  const urlInputs = loadUrls(opts.file, opts.urls);

  if (!urlInputs.length) {
    console.error(
      "Usage: node scripts/seo-crawler-audit.mjs --base http://127.0.0.1:3000 --file urls.txt"
    );
    process.exit(1);
  }

  const absoluteUrls = urlInputs
    .map((u) => toAbsoluteUrl(opts.base, u))
    .filter(Boolean);

  const results = [];
  for (const url of absoluteUrls) {
    const audit = await fetchAudit(url, opts);
    results.push(audit);
  }

  printResults(results);

  if (opts.json) {
    fs.writeFileSync(opts.json, `${JSON.stringify(results, null, 2)}\n`, "utf8");
    console.log(`Wrote JSON report: ${opts.json}`);
  }

  const hasBlocking = results.some(
    (r) => r.status !== 200 || r.noindexSignal || !r.canonical || r.canonicalMismatch
  );
  if (hasBlocking) process.exit(2);
}

await main();
