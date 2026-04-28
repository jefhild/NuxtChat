<template>
  <div class="looking-for-menu">
    <button
      ref="triggerRef"
      type="button"
      class="looking-for-menu__trigger"
      :disabled="disabled"
      @click="toggleMenu"
    >
      {{ $t("components.lookingFor.looking-for") }}
      <i class="mdi mdi-arrow-expand-right looking-for-menu__trigger-icon" aria-hidden="true" />
    </button>

    <Teleport to="body">
      <Transition name="looking-for-panel-fade">
        <div
          v-if="menu"
          class="looking-for-panel"
          :style="panelStyle"
        >
          <div ref="panelRef" class="looking-for-panel__card">
            <div v-if="userProfile" class="looking-for-panel__profile">
              <img
                v-if="userProfile.avatar_url"
                :src="userProfile.avatar_url"
                class="looking-for-panel__avatar"
                alt=""
              >
              <div v-else class="looking-for-panel__avatar looking-for-panel__avatar--placeholder">
                <i class="mdi mdi-account" aria-hidden="true" />
              </div>
              <div class="looking-for-panel__profile-copy">
                <div class="looking-for-panel__profile-name">
                  {{ userProfile.displayname }}
                </div>
                <div class="looking-for-panel__profile-tagline">
                  {{ userProfile.tagline }}
                </div>
              </div>
            </div>

            <div class="looking-for-panel__divider" />

            <div class="looking-for-panel__options">
              <label
                v-for="option in lookingForOptions"
                :key="option.id"
                class="looking-for-option"
              >
                <div class="looking-for-option__copy">
                  <input
                    :checked="userLookingForIds.includes(option.id)"
                    type="checkbox"
                    :disabled="disabled"
                    @change="toggleLookingFor(userId, option.id, $event.target.checked)"
                  >
                  <span>{{ option.name }}</span>
                </div>
                <i
                  :class="['mdi', option.icon, 'looking-for-option-icon']"
                  :style="{
                    '--looking-for-option-icon-color': userLookingForIds.includes(option.id)
                      ? resolveIconColor(option.color)
                      : 'rgb(var(--color-foreground) / 0.62)'
                  }"
                  aria-hidden="true"
                />
              </label>
            </div>

            <div class="looking-for-panel__actions">
              <button type="button" class="ui-settings-btn ui-settings-btn--secondary looking-for-panel__btn" @click="menu = false">
                {{ $t("components.lookingFor.cancel") }}
              </button>
              <button type="button" class="ui-settings-btn ui-settings-btn--primary looking-for-panel__btn looking-for-panel__btn--primary" @click="saveChanges">
                {{ $t("components.lookingFor.save") }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed, nextTick } from "vue";
import { useLookingFor } from "@/composables/useLookingFor";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const menu = ref(false);
const triggerRef = ref(null);
const panelRef = ref(null);
const panelStyle = ref({});

const emit = defineEmits(["lookingForUpdated"]);

const props = defineProps({
  userProfile: {
    type: Object,
    required: true,
    validator: (val) => val && val.user_id,
  },
  refreshLookingForMenu: Boolean,
  disabled: { type: Boolean, default: false },
});

const userId = computed(() => props.userProfile?.user_id);

const {
  lookingForOptions,
  userLookingForIds,
  fetchLookingForOptions,
  fetchUserLookingFor,
  toggleLookingFor,
} = useLookingFor();

const ICON_COLORS = {
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
  pink: "#ec4899",
  orange: "#f97316",
  purple: "#a855f7",
  "deep-purple": "#7e22ce",
  "blue-lighten-1": "#38bdf8",
};

const resolveIconColor = (color) => {
  const normalized = String(color || "").trim().toLowerCase();
  return ICON_COLORS[normalized] || normalized || "rgb(var(--color-foreground) / 0.62)";
};

const updatePanelPosition = async () => {
  await nextTick();
  const trigger = triggerRef.value;
  if (!trigger) return;
  const rect = trigger.getBoundingClientRect();
  const width = Math.min(340, window.innerWidth - 24);
  const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12));
  const top = Math.min(rect.bottom + 10, window.innerHeight - 24);
  panelStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
    width: `${width}px`,
  };
};

const closeOnOutside = (event) => {
  if (!menu.value) return;
  const trigger = triggerRef.value;
  const panel = panelRef.value;
  const target = event.target;
  if (panel?.contains(target) || trigger?.contains(target)) return;
  menu.value = false;
};

const closeOnEscape = (event) => {
  if (event.key === "Escape") {
    menu.value = false;
  }
};

const init = async () => {
  if (!userId.value) return;
  await fetchLookingForOptions();
  await fetchUserLookingFor(userId.value);
};

const toggleMenu = async () => {
  if (props.disabled) return;
  menu.value = !menu.value;
  if (menu.value) {
    await updatePanelPosition();
  }
};

onMounted(() => {
  init();
  window.addEventListener("pointerdown", closeOnOutside);
  window.addEventListener("keydown", closeOnEscape);
  window.addEventListener("resize", updatePanelPosition);
  window.addEventListener("scroll", updatePanelPosition, true);
});

onBeforeUnmount(() => {
  window.removeEventListener("pointerdown", closeOnOutside);
  window.removeEventListener("keydown", closeOnEscape);
  window.removeEventListener("resize", updatePanelPosition);
  window.removeEventListener("scroll", updatePanelPosition, true);
});

watch(() => props.refreshLookingForMenu, init);
watch(menu, (open) => {
  if (open) {
    updatePanelPosition();
  }
});

const saveChanges = () => {
  menu.value = false;
  emit("lookingForUpdated");
};
</script>

<style scoped>
.looking-for-menu__trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 0;
  background: transparent;
  color: rgb(var(--color-primary));
  font: inherit;
  font-weight: 600;
}

.looking-for-menu__trigger:disabled {
  opacity: 0.8;
  cursor: default;
}

.looking-for-menu__trigger-icon {
  font-size: 1rem;
}

.looking-for-panel {
  position: fixed;
  z-index: 2405;
}

.looking-for-panel__card {
  padding: 0.85rem;
  border: 1px solid rgb(var(--color-border) / 0.72);
  border-radius: 16px;
  background: rgb(var(--color-surface));
  box-shadow: 0 18px 44px rgb(15 23 42 / 0.24);
}

.looking-for-panel__profile {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.looking-for-panel__avatar {
  width: 2.6rem;
  height: 2.6rem;
  border-radius: 999px;
  object-fit: cover;
}

.looking-for-panel__avatar--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(var(--color-foreground) / 0.08);
  color: rgb(var(--color-foreground) / 0.48);
}

.looking-for-panel__profile-name {
  color: rgb(var(--color-foreground));
  font-weight: 600;
}

.looking-for-panel__profile-tagline {
  color: rgb(var(--color-foreground) / 0.64);
  font-size: 0.82rem;
}

.looking-for-panel__divider {
  height: 1px;
  margin: 0.8rem 0;
  background: rgb(var(--color-border) / 0.72);
}

.looking-for-panel__options {
  display: grid;
  gap: 0.5rem;
}

.looking-for-option {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.6rem;
  border-radius: 12px;
}

.looking-for-option:hover {
  background: rgb(var(--color-foreground) / 0.04);
}

.looking-for-option__copy {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  color: rgb(var(--color-foreground) / 0.86);
}

.looking-for-option__copy input {
  width: 1rem;
  height: 1rem;
  accent-color: rgb(var(--color-primary));
}

.looking-for-option-icon {
  color: var(--looking-for-option-icon-color, rgb(var(--color-foreground) / 0.62));
  font-size: 1.15rem;
}

.looking-for-panel__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  margin-top: 0.85rem;
}

.looking-for-panel__btn {
  min-height: 2.25rem;
  padding: 0.5rem 0.85rem;
  font: inherit;
}

.looking-for-panel__btn--primary {
  color: rgb(var(--color-primary-foreground));
}

.looking-for-panel-fade-enter-active,
.looking-for-panel-fade-leave-active {
  transition: opacity 140ms ease, transform 140ms ease;
}

.looking-for-panel-fade-enter-from,
.looking-for-panel-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
