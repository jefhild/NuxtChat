# Local LLM Migration Assessment

## Summary

Yes, you can reduce dependence on OpenAI, but I would not move everything at once. For this app, local/self-hosted LLMs are realistic for chat, persona replies, language practice, translation drafts, onboarding, and admin content generation. Moderation is the hardest part to replace safely.

Your app currently uses OpenAI through `server/utils/openaiGateway.js`, plus direct chat, translation, and moderation calls. Translation expects JSON from chat completions in `server/utils/translate.ts`. Mood feed moderation uses OpenAI's moderation endpoint directly in `server/utils/moodFeedModeration.js`. Runtime config only exposes OpenAI key/model settings in `nuxt.config.ts`.

## Strengths

- More control over data, prompts, retention, logs, and model behavior.
- Lower marginal cost once traffic is high enough to justify GPU/server cost.
- Easier to build private RAG over your collected content without sending it to a third party.
- OpenAI-compatible local servers make migration feasible: Ollama supports parts of the OpenAI API, including chat completions; vLLM provides an OpenAI-compatible server for chat, completions, responses, and embeddings; TGI also supports an OpenAI-compatible messages API.
- `llama.cpp` is useful for lightweight local/edge serving and exposes an OpenAI-compatible `llama-server`.

## Weaknesses

- Quality will usually drop versus top hosted models, especially for multilingual nuance, safety judgment, and long-context instruction following.
- You become responsible for uptime, GPU capacity, model updates, abuse handling, logging, privacy, and evaluation.
- Moderation cannot be treated as "just another chat prompt." You need deterministic rules, model classification, thresholds, human review queues, and audit trails.
- Translation quality for `en/fr/ru/zh` may be acceptable, but you will need automated checks because bad JSON, wrong language, or over-literal translation will happen more often.
- Local does not mean free: production serving needs reachable infrastructure. A laptop-local model is fine for testing, not for a public Nuxt app unless the production server can reach it reliably.

## High-Level Migration

1. Start with a provider gateway. Keep the app's OpenAI-style interface, but make the backend provider configurable: OpenAI, Ollama, vLLM, TGI, or llama.cpp. This keeps most app code stable.

2. Run a local compatibility test. Try `OPENAI_BASE_URL` against an OpenAI-compatible local server and alias local model names to the hardcoded model names your app already uses, such as `gpt-4o-mini`, `gpt-4.1-mini`, and `gpt-4`. This may work for chat paths, but moderation is likely to fail unless the local server implements `/v1/moderations`.

3. Move low-risk workloads first. Migrate admin drafts, SEO translation drafts, profile translation, onboarding suggestions, persona chat, and language-practice chat before safety-critical moderation.

4. Keep moderation hybrid at first. Use local rules plus a local classifier/model for pre-screening, but keep OpenAI or another mature moderation provider as fallback until you have enough labeled app data and review workflow confidence.

5. Use collected content carefully. Do not expect the model to "learn" automatically. Use your content first as retrieval data: store approved conversations, profiles, FAQs, corrections, and translations, then retrieve relevant examples into prompts. Fine-tuning can come later, after consent, filtering, deduplication, labeling, and evaluation.

6. Evaluate before switching traffic. Build test sets for moderation, translation, chat quality, language correction quality, JSON validity, latency, and refusal behavior. Route a small percentage of non-critical requests to the local provider, compare outputs, then expand.

## Assumptions

- The goal is reducing provider dependence, not necessarily eliminating all external AI immediately.
- Recommended first target: local/self-hosted chat completions for translation and conversation.
- Recommended last target: full moderation replacement.
- No repo changes were made during the original assessment.

## References

- Ollama OpenAI compatibility: https://docs.ollama.com/api/openai-compatibility
- vLLM OpenAI-compatible server: https://docs.vllm.ai/en/latest/serving/openai_compatible_server/
- Hugging Face TGI Messages API: https://huggingface.co/docs/text-generation-inference/main/messages_api
- llama.cpp: https://github.com/ggml-org/llama.cpp
