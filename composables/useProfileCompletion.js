import { computed } from "vue";
import { useAuthStore } from "@/stores/authStore1";

export function useProfileCompletion() {
  const authStore = useAuthStore();
  const profile = computed(() => authStore.userProfile || {});

  // Define weights for each field
  const weights = {
    displayname: 25,
    age: 15,
    gender_id: 10,
    avatar_url: 10,
    bio: 20,
    interests: 20, // assuming interests is an array
  };

  const percent = computed(() => {
    let total = 0;
    if (!profile.value) return 0;

    for (const [key, weight] of Object.entries(weights)) {
      const value = profile.value[key];
      if (Array.isArray(value)) {
        if (value.length) total += weight;
      } else if (value) {
        total += weight;
      }
    }

    return total;
  });

  const missingFields = computed(() => {
    return Object.keys(weights).filter((key) => {
      const value = profile.value[key];
      return Array.isArray(value) ? !value.length : !value;
    });
  });

  const isComplete = computed(() => percent.value >= 100);

  return {
    percent,
    missingFields,
    isComplete,
  };
}
