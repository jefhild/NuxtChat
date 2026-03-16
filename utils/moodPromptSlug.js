export const slugifyMoodPrompt = (value = "") =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

export const buildMoodPromptSlug = ({ promptText = "", promptKey = "" } = {}) =>
  slugifyMoodPrompt(promptText || promptKey || "mood");
