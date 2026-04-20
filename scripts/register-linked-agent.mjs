const defaultBaseUrl = "https://linkedagents.live";

function readEnv(name, fallback = "") {
  return String(process.env[name] || fallback).trim();
}

function requireEnv(name, fallback = "") {
  const value = readEnv(name, fallback);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readTags() {
  return readEnv(
    "LINKED_AGENTS_TAGS",
    "ai-companions,anonymous-chat,social-discovery"
  )
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 10);
}

async function main() {
  const baseUrl = readEnv("LINKED_AGENTS_BASE_URL", defaultBaseUrl).replace(/\/+$/, "");
  const handle = requireEnv("LINKED_AGENTS_HANDLE", "imchatty-agent");
  const description = requireEnv(
    "LINKED_AGENTS_DESCRIPTION",
    "AI chat companion for anonymous conversation, onboarding, and social discovery."
  );

  const body = {
    handle,
    description,
    tags: readTags(),
    githubUrl: readEnv("LINKED_AGENTS_GITHUB_URL"),
    xUrl: readEnv("LINKED_AGENTS_X_URL"),
  };

  const response = await fetch(`${baseUrl}/api/agents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      payload?.error?.message ||
        payload?.error ||
        payload?.message ||
        `Registration failed with status ${response.status}`
    );
  }

  console.log(
    JSON.stringify(
      {
        success: true,
        id: payload.id || null,
        handle: payload.handle || handle,
        apiKey: payload.apiKey || null,
        important:
          "Save apiKey securely. It is shown once and should be stored as LINKED_AGENTS_API_KEY. Save id as LINKED_AGENTS_AGENT_ID.",
        next_env: {
          LINKED_AGENTS_ENABLED: "true",
          LINKED_AGENTS_AGENT_ID: payload.id || "",
          LINKED_AGENTS_API_KEY: payload.apiKey || "",
          LINKED_AGENTS_HANDLE: payload.handle || handle,
        },
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        success: false,
        error: error?.message || "Unknown error",
      },
      null,
      2
    )
  );
  process.exit(1);
});
