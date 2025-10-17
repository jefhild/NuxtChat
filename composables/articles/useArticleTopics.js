import { ref } from "vue";

export const useArticleTopics = () => {
  const topics = ref([]);
  const isLoading = ref(false);
  const error = ref(null);

  const refresh = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      const res = await $fetch("/api/articles/threads");
      topics.value = Array.isArray(res) ? res : [];
    } catch (e) {
      error.value = e;
    } finally {
      isLoading.value = false;
    }
  };

  return { topics, isLoading, error, refresh };
};
