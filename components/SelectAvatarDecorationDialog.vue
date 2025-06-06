<template>
  <v-card>
    <v-card-title>{{ $t('components.select-avatar-decoration.title') }}</v-card-title>
    <v-card-text>
      <p>{{ $t('components.select-avatar-decoration.choose') }}</p>
      <v-row>
        <v-col
          v-for="decoration in allAvatarDecorations"
          :key="decoration.name"
          cols="4"
          class="d-flex flex-column align-center"
        >
          <div
            class="decoration-option"
            :class="{ selected: decoration.url === selectedDecoration }"
            @click="handleDecorationClick(decoration.url)"
          >
            <div class="photo-container">
              <NuxtImg v-if="photopath" :src="photopath" class="cover-image" alt="Profile Main Image"/>
              <NuxtImg
                v-if="decoration.url"
                :src="decoration.url"
                width="80"
                height="80"
                class="avatar-decoration"
              />
            </div>
          </div>
          <div class="decoration-label text-caption mt-1">
            {{ formatName(decoration.name) }}
          </div>
        </v-col>
      </v-row>
    </v-card-text>
    <v-card-actions>
      <v-btn color="primary" @click="selectDecoration">{{ $t('components.select-avatar-decoration.done') }}</v-btn>
      <v-btn @click="closeDialog">{{ $t('components.select-avatar-decoration.cancel') }}</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
const { t } = useI18n();
const allAvatarDecorations = ref<{ name: string; url: string }[]>([]);
const selectedDecoration = ref<string | null>(null);

const emit = defineEmits(["closeDialog"]);

const { getAllAvatarDecorations, updateAvatarDecoration } = useDb();

const authStore = useAuthStore();

const props = defineProps({
  userId: {
    type: String,
    required: true,
  },
  photopath: {
    type: String,
    default: true,
  },
});

const formatName = (name: string) => {
  return name
    .replace(/\.[^/.]+$/, "") // remove file extension
    .replace(/[-_]/g, " ") // replace dashes/underscores with space
    .replace(/\b\w/g, (c) => c.toUpperCase()); // capitalize each word
};

onMounted(async () => {
  const decorations = await getAllAvatarDecorations();

  allAvatarDecorations.value = [{ name: "None", url: "" }, ...decorations];

  console.log(allAvatarDecorations.value);
});

const handleDecorationClick = (url: string) => {
  selectedDecoration.value = url;
};

const selectDecoration = async () => {
  selectedDecoration.value = selectedDecoration.value || null;

  await updateAvatarDecoration(props.userId, selectedDecoration.value);
  if (authStore.userProfile) {
  authStore.userProfile.avatar_decoration_url = selectedDecoration.value;
}
  console.log("userprofile", authStore.userProfile);
  closeDialog();
};

const closeDialog = () => {
  emit("closeDialog");
};
</script>

<style scoped>
.photo-container {
  position: relative;
}

.cover-image {
  width: 67px;
  height: 67px;
  border-radius: 50%;
  object-fit: cover;
}

.decoration-option {
  border: 2px solid transparent;
  border-radius: 8px;
  padding: 4px;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.decoration-option:hover {
  border-color: #999;
}

.decoration-option.selected {
  border-color: #1976d2;
  /* Vuetify primary */
}

.decoration-label {
  text-align: center;
  color: #555;
}

.avatar-decoration {
  position: absolute;
  top: -7px;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  pointer-events: none;
  z-index: 2;
  object-fit: contain;
}
</style>
