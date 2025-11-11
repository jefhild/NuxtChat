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

  return {
    listBots,
    createBot,
    updateBot,
    deleteBot,
  };
};
