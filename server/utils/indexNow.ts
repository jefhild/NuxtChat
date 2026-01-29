type IndexNowOptions = {
  siteUrl?: string | null;
  key?: string | null;
  urls?: Array<string | null | undefined>;
  host?: string | null;
  keyLocation?: string | null;
  endpoint?: string | null;
};

const DEFAULT_ENDPOINT = "https://api.indexnow.org/indexnow";
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

const normalizeBaseUrl = (value?: string | null) => {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, "");
};

const toAbsoluteUrl = (base: string, url: string) => {
  if (/^https?:\/\//i.test(url)) return url;
  const suffix = url.startsWith("/") ? url : `/${url}`;
  return `${base}${suffix}`;
};

export const submitIndexNowUrls = async (options: IndexNowOptions) => {
  const baseUrl = normalizeBaseUrl(options.siteUrl || "");
  const key = options.key ? String(options.key).trim() : "";
  const urls = Array.isArray(options.urls) ? options.urls : [];

  if (!baseUrl || !key || urls.length === 0) {
    return { ok: false, skipped: true, reason: "missing-input" };
  }

  let host = options.host ? String(options.host).trim() : "";
  try {
    if (!host) host = new URL(baseUrl).host;
  } catch (err) {
    console.warn("[indexnow] invalid site url:", baseUrl, err);
    return { ok: false, skipped: true, reason: "invalid-site-url" };
  }

  const hostname = host.split(":")[0];
  if (
    LOCAL_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".local")
  ) {
    return { ok: false, skipped: true, reason: "local-host" };
  }

  const absoluteUrls = urls
    .map((url) => (url ? String(url).trim() : ""))
    .filter(Boolean)
    .map((url) => toAbsoluteUrl(baseUrl, url));

  const urlList = Array.from(new Set(absoluteUrls));
  if (urlList.length === 0) {
    return { ok: false, skipped: true, reason: "no-urls" };
  }

  const keyLocation =
    options.keyLocation && String(options.keyLocation).trim()
      ? String(options.keyLocation).trim()
      : `${baseUrl}/${key}.txt`;

  const endpoint =
    options.endpoint && String(options.endpoint).trim()
      ? String(options.endpoint).trim()
      : DEFAULT_ENDPOINT;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        host,
        key,
        keyLocation,
        urlList,
      }),
    });

    if (!response.ok) {
      console.warn("[indexnow] submission failed:", response.status);
    }

    return { ok: response.ok, status: response.status };
  } catch (err) {
    console.warn("[indexnow] submission error:", err);
    return { ok: false, error: err };
  }
};
