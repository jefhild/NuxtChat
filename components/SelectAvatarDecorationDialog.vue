<template>
  <section class="decoration-dialog">
    <header class="decoration-dialog__header">
      <h2 class="decoration-dialog__title">
        {{ $t("components.select-avatar-decoration.title") }}
      </h2>
    </header>

    <div class="decoration-dialog__body">
      <p class="decoration-dialog__description">
        {{ $t("components.select-avatar-decoration.choose") }}
      </p>

      <div class="decoration-grid">
        <button
          v-for="decoration in allAvatarDecorations"
          :key="decoration.url || decoration.name"
          type="button"
          class="decoration-option"
          :class="{ selected: decoration.url === selectedDecoration }"
          @click="handleDecorationClick(decoration.url)"
        >
          <div class="photo-container">
            <NuxtImg
              v-if="photopath"
              :src="photopath"
              class="cover-image"
              alt="Profile Main Image"
            />
            <NuxtImg
              v-if="decoration.url"
              :src="decoration.url"
              width="80"
              height="80"
              class="avatar-decoration"
            />
          </div>
          <span class="decoration-label">
            {{ formatName(decoration.name) }}
          </span>
        </button>
      </div>
    </div>

    <footer class="decoration-dialog__actions">
      <button type="button" class="decoration-dialog__primary" @click="selectDecoration">
        {{ $t("components.select-avatar-decoration.done") }}
      </button>
      <button type="button" class="decoration-dialog__secondary" @click="closeDialog">
        {{ $t("components.select-avatar-decoration.cancel") }}
      </button>
    </footer>
  </section>
</template>

<script setup lang="ts">
const allAvatarDecorations = ref<{ name: string; url: string }[]>([]);
const selectedDecoration = ref<string | null>(null);

const emit = defineEmits(["closeDialog", "selected"]);

const { getAllAvatarDecorations, updateAvatarDecoration } = useDb();

const authStore = useAuthStore();

const props = defineProps({
  userId: {
    type: String,
    required: true,
  },
  photopath: {
    type: String,
    default: "",
  },
  currentDecorationUrl: {
    type: String,
    default: "",
  },
});

const formatName = (name: string) => {
  return name
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

onMounted(async () => {
  const decorations = await getAllAvatarDecorations();
  allAvatarDecorations.value = [{ name: "None", url: "" }, ...decorations];
  selectedDecoration.value = props.currentDecorationUrl || "";
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
  emit("selected", selectedDecoration.value || "");
  closeDialog();
};

const closeDialog = () => {
  emit("closeDialog");
};
</script>

<style scoped>
.decoration-dialog {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.decoration-dialog__header,
.decoration-dialog__actions {
  display: flex;
  align-items: center;
}

.decoration-dialog__actions {
  justify-content: flex-end;
  gap: 0.75rem;
}

.decoration-dialog__title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: rgb(var(--color-foreground));
}

.decoration-dialog__description {
  margin: 0 0 1rem;
  color: rgb(var(--color-foreground) / 0.72);
}

.decoration-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 0.9rem;
}

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
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
  padding: 0.75rem 0.55rem;
  border: 1px solid rgb(var(--color-border) / 0.72);
  border-radius: 12px;
  background: rgb(var(--color-surface));
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease, transform 0.2s ease;
}

.decoration-option:hover,
.decoration-option:focus-visible {
  outline: none;
  border-color: rgb(var(--color-primary) / 0.38);
  background: rgb(var(--color-primary) / 0.08);
  transform: translateY(-1px);
}

.decoration-option.selected {
  border-color: rgb(var(--color-primary));
  background: rgb(var(--color-primary) / 0.12);
}

.decoration-label {
  text-align: center;
  color: rgb(var(--color-foreground) / 0.72);
  font-size: 0.82rem;
  line-height: 1.35;
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

.decoration-dialog__primary,
.decoration-dialog__secondary {
  min-height: 2.5rem;
  padding: 0.6rem 1rem;
  border-radius: 10px;
  font: inherit;
  font-weight: 600;
}

.decoration-dialog__primary {
  border: 0;
  background: rgb(var(--color-primary));
  color: rgb(var(--color-background));
}

.decoration-dialog__secondary {
  border: 1px solid rgb(var(--color-border) / 0.72);
  background: transparent;
  color: rgb(var(--color-foreground) / 0.82);
}
</style>
