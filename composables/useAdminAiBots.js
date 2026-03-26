export const useAdminAiBots = () => {
  const basePath = "/api/admin/ai-bots";

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

  return {
    listBots,
    createBot,
    updateBot,
    deleteBot,
    postToMoltbook,
    generateMoltbookDraft,
    runHoneyMoltbook,
  };
};
