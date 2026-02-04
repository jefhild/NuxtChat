import OpenAI from "openai";

export const resolveOpenAIConfig = ({
  runtimeConfig,
  config,
  apiKey,
  model,
} = {}) => {
  const cfg =
    runtimeConfig ||
    config ||
    (typeof useRuntimeConfig === "function" ? useRuntimeConfig() : {});

  const resolvedApiKey =
    apiKey ||
    cfg?.openaiApiKey ||
    cfg?.OPENAI_API_KEY ||
    cfg?.public?.OPENAI_API_KEY ||
    null;

  const resolvedModel =
    model || cfg?.OPENAI_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";

  return { apiKey: resolvedApiKey, model: resolvedModel, runtimeConfig: cfg };
};

export const getOpenAIClient = (opts = {}) => {
  const { apiKey, model } = resolveOpenAIConfig(opts);
  const client = apiKey ? new OpenAI({ apiKey }) : null;
  return { client, apiKey, model };
};
