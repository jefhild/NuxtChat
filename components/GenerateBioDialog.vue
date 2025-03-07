<template>
  <v-card title="Generate Bio">
    <v-card-text>
      <v-row v-if="isLoading" justify="center" no-gutters>
        <v-col class="text-center">
          <v-progress-circular indeterminate color="primary" size="64" />
        </v-col>
      </v-row>
      <v-row v-else>
        <v-text-field v-model="keywords" label="Enter keywords" variant="outlined"
          placeholder="e.g., developer, fitness, travel"></v-text-field>

        <v-alert v-if="error" type="error" density="compact">
          {{ error }}
        </v-alert>
      </v-row>
    </v-card-text>

    <v-btn color="primary" text="Generate" @click="generateBio"></v-btn>
  </v-card>
</template>

<script setup>
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/authStore";

const emit = defineEmits(["update:modelValue", "updateBio"]);

const router = useRouter();
const supabase = useSupabaseClient();
const authStore = useAuthStore();
const userProfile = ref(authStore.userProfile);

const isLoading = ref(false);

const keywords = ref("");
const error = ref("");

const generateBio = async () =>
{
  isLoading.value = true;
  error.value = "";

  const payload = {
    keywords: keywords.value,
  };

  try
  {
    const response = await $fetch("/api/aiGenerateBio", {
      method: "POST",
      body: payload,
    });

    if (response.success && response.aiResponse)
    {
      if (response.aiResponse.trim() == "inappropriate")
      {
        error.value = "Please enter appropriate keywords.";
        return ;
      }
      
      userProfile.value.bio = response.aiResponse;

      const { error } = await supabase
        .from("profiles")
        .update({
          bio: userProfile.value.bio,
        })
        .eq("id", userProfile.value.id);
      if (error) throw error;
      emit("update:modelValue", false);
      emit("updateBio", userProfile.value.bio);
    }

  } catch (error) { console.error("Error fetching AI response:", error); } 
  finally {
    isLoading.value = false;
  }
};
</script>
