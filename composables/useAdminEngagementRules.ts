export type EngagementRulePayload = {
  name: string;
  context: string;
  description?: string | null;
  rules: Record<string, any>;
  is_default?: boolean;
  is_active?: boolean;
};

export const useAdminEngagementRules = () => {
  const basePath = "/api/admin/engagement-rules";

  const listRules = async () => {
    return await $fetch(basePath, { method: "GET" });
  };

  const createRule = async (payload: EngagementRulePayload) => {
    return await $fetch(basePath, {
      method: "POST",
      body: payload,
    });
  };

  const updateRule = async (id: string, payload: EngagementRulePayload) => {
    if (!id) throw new Error("Missing engagement rule id");
    return await $fetch(`${basePath}/${id}`, {
      method: "PUT",
      body: payload,
    });
  };

  const deleteRule = async (id: string) => {
    if (!id) throw new Error("Missing engagement rule id");
    return await $fetch(`${basePath}/${id}`, { method: "DELETE" });
  };

  return {
    listRules,
    createRule,
    updateRule,
    deleteRule,
  };
};
