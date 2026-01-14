import OpenAI from "openai";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { createError, defineEventHandler, readBody } from "h3";

const MAX_WEBP_BYTES = 50 * 1024;
const AVATAR_SIZE = 256;

const buildPrompt = ({ displayname, gender, age, bio }) => {
  const bioText = String(bio || "").trim();
  const bioSnippet = bioText ? bioText.slice(0, 200) : "";
  const ageText = age ? `, age ${age}` : "";
  return [
    "Create a friendly illustrated avatar headshot.",
    "Simple, clean vector-like cartoon style.",
    "Centered face and shoulders, soft lighting, neutral background.",
    "No text, no logos, no watermarks.",
    `Person: ${displayname || "User"} (${gender || "Other"}${ageText}).`,
    bioSnippet ? `Bio cues: ${bioSnippet}` : "",
  ]
    .filter(Boolean)
    .join(" ");
};

const encodeWebp = async (inputBuffer, quality) => {
  return sharp(inputBuffer)
    .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover" })
    .webp({ quality, effort: 4 })
    .toBuffer();
};

const compressToWebp = async (inputBuffer) => {
  let quality = 70;
  let output = await encodeWebp(inputBuffer, quality);
  while (output.length > MAX_WEBP_BYTES && quality > 40) {
    quality -= 10;
    output = await encodeWebp(inputBuffer, quality);
  }
  return output;
};

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { userId, displayname, gender, age, bio } = body || {};

  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: "Missing userId" });
  }

  const config = useRuntimeConfig();
  const apiKey = config.openaiApiKey || config.OPENAI_API_KEY;
  if (!apiKey) {
    throw createError({ statusCode: 500, statusMessage: "Missing OpenAI key" });
  }

  const openai = new OpenAI({ apiKey });
  const prompt = buildPrompt({ displayname, gender, age, bio });

  const hashString = (input) => {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  };

  const styleVariants = [
    {
      name: "rounded-cartoon",
      description:
        "Rounded cartoon avatar with soft curves, big eyes, and a warm, friendly smile.",
      scaffold: `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#eef2ff"/>
  <circle cx="120" cy="120" r="60" fill="#e2e8f0"/>
  <circle cx="420" cy="100" r="70" fill="#f8fafc"/>
  <path d="M96 360c42-64 278-64 320 0v120H96z" fill="#60a5fa"/>
  <rect x="216" y="300" width="80" height="60" rx="24" fill="#f7c6a5"/>
  <circle cx="176" cy="224" r="20" fill="#f7c6a5"/>
  <circle cx="336" cy="224" r="20" fill="#f7c6a5"/>
  <path d="M170 248c6 22 24 38 40 44 24 10 70 10 92 0 16-6 34-22 40-44 10-34 0-104-36-128-30-20-90-20-120 0-36 24-46 94-36 128z" fill="#f7c6a5"/>
  <path d="M156 214c22-70 178-86 200-10 10 32 8 54 4 72-6-36-34-56-86-60-44-4-90 6-118 26z" fill="#1f2937"/>
  <circle cx="214" cy="230" r="14" fill="#111827"/>
  <circle cx="298" cy="230" r="14" fill="#111827"/>
  <circle cx="214" cy="226" r="5" fill="#f8fafc"/>
  <circle cx="298" cy="226" r="5" fill="#f8fafc"/>
  <path d="M256 252c-6 6-6 16 0 22" stroke="#111827" stroke-width="7" fill="none" stroke-linecap="round"/>
  <path d="M214 276c16 16 68 16 84 0" stroke="#111827" stroke-width="9" fill="none" stroke-linecap="round"/>
</svg>
`.trim(),
    },
    {
      name: "minimal-clean",
      description:
        "Minimal clean avatar with crisp shapes, smaller eyes, subtle features, and a simple top.",
      scaffold: `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#f8fafc"/>
  <rect x="40" y="50" width="140" height="140" rx="32" fill="#e5e7eb"/>
  <rect x="350" y="60" width="120" height="120" rx="28" fill="#e2e8f0"/>
  <path d="M110 360c36-58 256-58 292 0v120H110z" fill="#34d399"/>
  <rect x="220" y="300" width="72" height="58" rx="22" fill="#f2c4a0"/>
  <circle cx="182" cy="228" r="18" fill="#f2c4a0"/>
  <circle cx="330" cy="228" r="18" fill="#f2c4a0"/>
  <path d="M174 250c6 20 22 34 36 40 22 9 64 9 86 0 14-6 30-20 36-40 10-30 0-96-30-118-28-20-84-20-112 0-30 22-40 88-30 118z" fill="#f2c4a0"/>
  <path d="M164 214c20-56 168-68 186-6 8 26 6 44 2 60-8-30-30-46-74-50-40-4-78 6-114 26z" fill="#374151"/>
  <circle cx="220" cy="230" r="11" fill="#111827"/>
  <circle cx="292" cy="230" r="11" fill="#111827"/>
  <path d="M256 252c-4 6-4 12 0 18" stroke="#111827" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M220 274c14 12 58 12 72 0" stroke="#111827" stroke-width="8" fill="none" stroke-linecap="round"/>
</svg>
`.trim(),
    },
    {
      name: "bold-graphic",
      description:
        "Bold graphic avatar with strong contrast, defined hair shape, and a simple jacket.",
      scaffold: `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#f1f5f9"/>
  <path d="M40 140c90-110 340-110 432 0" fill="#e2e8f0"/>
  <path d="M92 360c48-68 280-68 328 0v120H92z" fill="#f97316"/>
  <rect x="216" y="298" width="80" height="62" rx="22" fill="#f2c1a0"/>
  <circle cx="178" cy="224" r="18" fill="#f2c1a0"/>
  <circle cx="334" cy="224" r="18" fill="#f2c1a0"/>
  <path d="M168 246c8 24 26 40 42 46 24 10 74 10 98 0 16-6 34-22 42-46 12-34 0-102-34-128-32-22-98-22-130 0-34 26-46 94-34 128z" fill="#f2c1a0"/>
  <path d="M144 214c28-78 216-90 234-10 8 30 6 54 2 74-10-36-40-56-94-60-48-4-94 8-142 28z" fill="#111827"/>
  <circle cx="214" cy="230" r="14" fill="#0f172a"/>
  <circle cx="298" cy="230" r="14" fill="#0f172a"/>
  <path d="M256 252c-6 6-6 16 0 22" stroke="#0f172a" stroke-width="8" fill="none" stroke-linecap="round"/>
  <path d="M206 276c18 16 84 16 100 0" stroke="#0f172a" stroke-width="10" fill="none" stroke-linecap="round"/>
</svg>
`.trim(),
    },
  ];

  const styleSeed = `${userId || ""}-${displayname || ""}-${gender || ""}`;
  const styleIndex = hashString(styleSeed) % styleVariants.length;
  const chosenStyle = styleVariants[styleIndex];

  const svgPrompt = `
You are generating a small SVG avatar illustration.
Goal: a recognizable, friendly human headshot (not abstract shapes).
Style: ${chosenStyle.description}
Content: head-and-shoulders centered, neutral background, no text.
Must include: background, head, hair, eyes, nose, mouth, shoulders.
Constraints:
- Output ONLY valid SVG markup.
- SVG size 512x512 with viewBox="0 0 512 512".
- Use 4-6 flat colors, no external assets, no filters, no masks.
- No embedded base64 images.
Personalization hint: ${prompt}

Use a structure similar to this scaffold (adjust colors/shapes but keep the parts):
${chosenStyle.scaffold}
`.trim();

  const debug =
    String(config.AI_AVATAR_DEBUG || process.env.AI_AVATAR_DEBUG || "") ===
    "true";
  if (debug) {
    console.log("[avatar-generate] svg prompt:", svgPrompt);
  }

  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: svgPrompt }],
  });

  const raw = resp.choices?.[0]?.message?.content?.trim() || "";
  if (debug) {
    console.log("[avatar-generate] raw svg response:", raw);
  }
  const extractSvg = (text) => {
    const match = text.match(/<svg[\s\S]*?<\/svg>/i);
    return match ? match[0].trim() : "";
  };
  let svg = extractSvg(raw);
  if (!svg) {
    // Fallback: deterministic polished scaffold to avoid hard failure.
    svg = chosenStyle.scaffold;
  }

  const svgBuffer = Buffer.from(svg, "utf-8");
  const webpBuffer = await compressToWebp(svgBuffer);

  const supabase = createClient(
    config.public.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY
  );
  const filePath = `${userId}/avatar.webp`;

  const { error: uploadError } = await supabase.storage
    .from("profile-images")
    .upload(filePath, webpBuffer, {
      contentType: "image/webp",
      upsert: true,
      cacheControl: "3600",
    });

  if (uploadError) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to upload avatar",
    });
  }

  const { data: publicData } = supabase.storage
    .from("profile-images")
    .getPublicUrl(filePath);

  const publicUrl = publicData?.publicUrl;
  if (!publicUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to resolve public URL",
    });
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("user_id", userId);

  if (updateError) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to update profile avatar",
    });
  }

  return { success: true, avatarUrl: publicUrl };
});
