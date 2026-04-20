export const useAdminAiBots = () => {
  const basePath = "/api/admin/ai-bots";

  const getFetchErrorPayload = (error) =>
    error?.data || error?.response?._data || null;

  const getFetchErrorMessage = (error, fallback) => {
    const payload = getFetchErrorPayload(error);
    if (typeof payload === "string" && payload.includes("Cloudflare")) {
      return "Cloudflare returned a 502 from the imchatty.com origin before Nuxt could respond.";
    }
    const payloadError = payload?.error;
    if (typeof payloadError === "string" && payloadError.trim()) {
      return payloadError.trim();
    }
    if (payloadError?.message) return String(payloadError.message).trim();
    if (payload?.message) return String(payload.message).trim();
    if (error?.statusMessage) return String(error.statusMessage).trim();
    if (error?.message) return String(error.message).trim();
    return fallback;
  };

  const listBots = async () => {
    return await $fetch(basePath, { method: "GET" });
  };

  const createBot = async (payload) => {
    return await $fetch(basePath, {
      method: "POST",
      body: payload,
    });
  };

  const updateBot = async (id, payload) => {
    if (!id) throw new Error("Missing bot id");
    return await $fetch(`${basePath}/${id}`, {
      method: "PUT",
      body: payload,
    });
  };

  const deleteBot = async (id) => {
    if (!id) throw new Error("Missing bot id");
    return await $fetch(`${basePath}/${id}`, { method: "DELETE" });
  };

  const postToMoltbook = async (id, payload) => {
    if (!id) throw new Error("Missing bot id");
    return await $fetch(`${basePath}/${id}/moltbook/post`, {
      method: "POST",
      body: payload,
    });
  };

  const generateMoltbookDraft = async (id, payload = {}) => {
    if (!id) throw new Error("Missing bot id");
    return await $fetch(`${basePath}/${id}/moltbook/generate`, {
      method: "POST",
      body: payload,
    });
  };

  const runHoneyMoltbook = async (payload = {}) => {
    return await $fetch(`${basePath}/moltbook/run`, {
      method: "POST",
      body: payload,
    });
  };

  const runLinkedAgentsDailyProfile = async (payload = {}) => {
    try {
      return await $fetch(`${basePath}/linked-agents/daily-profile`, {
        method: "POST",
        body: payload,
      });
    } catch (error) {
      const wrapped = new Error(
        getFetchErrorMessage(
          error,
          "Failed to run LinkedAgents daily profile post."
        )
      );
      wrapped.data = getFetchErrorPayload(error);
      wrapped.statusCode = error?.statusCode || error?.response?.status;
      throw wrapped;
    }
  };

  return {
    listBots,
    createBot,
    updateBot,
    deleteBot,
    postToMoltbook,
    generateMoltbookDraft,
    runHoneyMoltbook,
    runLinkedAgentsDailyProfile,
  };
};
