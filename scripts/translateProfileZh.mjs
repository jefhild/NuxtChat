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

const args = process.argv.slice(2);
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 0;
const baseUrlArg = args.find((arg) => arg.startsWith("--base-url="));
const baseUrl = baseUrlArg
  ? baseUrlArg.split("=")[1]
  : process.env.SITE_URL || "http://localhost:3000";

loadEnvFile(path.resolve(__dirname, "..", ".env"));

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const fetchZhTranslations = async () => {
  const { data, error } = await supabase
    .from("profile_translations")
    .select("user_id, displayname, bio, tagline")
    .eq("locale", "zh");
  if (error) throw error;
  return data || [];
};

const run = async () => {
  const rows = await fetchZhTranslations();
  const targets = limit > 0 ? rows.slice(0, limit) : rows;
  if (!targets.length) {
    console.log("No zh profiles found.");
    return;
  }

  let success = 0;
  let failed = 0;

  for (const row of targets) {
    const payload = {
      userId: row.user_id,
      displayname: row.displayname || "",
      bio: row.bio || "",
      tagline: row.tagline || "",
      sourceLocale: "zh",
    };

    try {
      const resp = await fetch(`${baseUrl}/api/profile/translate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${text}`);
      }
      success += 1;
      console.log(`ok: ${row.user_id}`);
    } catch (err) {
      failed += 1;
      console.error(`fail: ${row.user_id} -> ${err.message || err}`);
    }
  }

  console.log(`done: ${success} ok, ${failed} failed`);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
