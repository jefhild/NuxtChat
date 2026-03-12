const baseUrl = "https://www.moltbook.com/api/v1";

function requireEnv(name, fallback = "") {
  const value = String(process.env[name] || fallback).trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function main() {
  const name = requireEnv("MOLTBOOK_AGENT_NAME", "imchatty");
  const description = requireEnv(
    "MOLTBOOK_AGENT_DESCRIPTION",
    "AI chat companion for anonymous conversation, onboarding, and social discovery."
  );

  const response = await fetch(`${baseUrl}/agents/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, description }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      payload?.error ||
        payload?.message ||
        `Registration failed with status ${response.status}`
    );
  }

  const agent = payload?.agent || {};

  console.log(JSON.stringify({
    success: true,
    name,
    description,
    api_key: agent.api_key || null,
    claim_url: agent.claim_url || null,
    verification_code: agent.verification_code || null,
    important:
      "Save api_key securely. Open claim_url to connect the agent to its human owner.",
  }, null, 2));
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
