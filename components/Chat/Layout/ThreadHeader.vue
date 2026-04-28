<template>
  <button
    :class="buttonClass"
    type="button"
    :disabled="!selectedUser"
    :aria-expanded="String(panelOpen)"
    aria-controls="thread-info-panel"
    @click="$emit('toggle')"
  >
    <div :class="leftClass">
      <div :class="avatarWrapClass">
        <div
          class="selected-avatar-surface"
          :style="{ width: `${avatarSize}px`, height: `${avatarSize}px` }"
        >
          <img
            v-if="selectedUser && selectedUser.avatar_url"
            :src="selectedUser.avatar_url"
            alt=""
            class="selected-avatar-image"
          >
          <span
            v-else
            class="avatar-fallback text-sm font-medium"
          >
            {{ selectedUserInitial }}
          </span>
        </div>
        <img
          v-if="selectedUserAvatarDecorationUrl"
          :src="selectedUserAvatarDecorationUrl"
          alt=""
          :class="decorationClass"
        >
        <span
          v-if="selectedUserFlagEmoji"
          class="selected-avatar-flag"
        >
          {{ selectedUserFlagEmoji }}
        </span>
        <i
          v-if="selectedUser"
          :class="genderClass"
          :style="{ '--selected-gender-color': selectedUserGenderColor }"
          aria-hidden="true"
        />
      </div>
      <div :class="infoClass">
        <div :class="titleClass">
          {{ selectedUserTitle }}
        </div>
        <div :class="subtitleClass">
          {{ selectedUserSubtitle }}
        </div>
      </div>
    </div>

    <div v-if="!mobile" class="profile-header-actions flex items-center">
      <span v-if="selectedUser" :class="desktopPresenceClass">
        <i
          :class="iconClass(selectedUserPresenceIcon, 'mr-1 text-[14px]')"
          aria-hidden="true"
        />
        {{ selectedUserPresenceLabel }}
      </span>
      <button
        type="button"
        class="header-chevron-btn"
        :disabled="!selectedUser"
        :aria-expanded="String(panelOpen)"
        aria-controls="thread-info-panel"
        @click.stop="$emit('toggle')"
      >
        <i
          :class="iconClass(panelOpen ? 'mdi-chevron-up' : 'mdi-chevron-down', 'text-base')"
          aria-hidden="true"
        />
      </button>
    </div>

    <template v-else>
      <span v-if="selectedUser" :class="mobilePresenceClass">
        <i
          :class="iconClass(selectedUserPresenceIcon, 'mr-1 text-xs')"
          aria-hidden="true"
        />
        {{ selectedUserPresenceLabel }}
      </span>

      <button
        type="button"
        class="header-chevron-btn"
        :disabled="!selectedUser"
        :aria-expanded="String(panelOpen)"
        aria-controls="thread-info-panel"
        @click.stop="$emit('toggle')"
      >
        <i
          :class="iconClass(panelOpen ? 'mdi-chevron-up' : 'mdi-chevron-down', 'text-base')"
          aria-hidden="true"
        />
      </button>
    </template>
  </button>
</template>

<script setup>
const props = defineProps({
  mobile: { type: Boolean, default: false },
  panelOpen: { type: Boolean, default: false },
  selectedUser: { type: Object, default: null },
  selectedUserInitial: { type: String, default: "?" },
  selectedUserAvatarDecorationUrl: { type: String, default: "" },
  selectedUserFlagEmoji: { type: String, default: "" },
  selectedUserGenderClass: { type: [String, Array, Object], default: "" },
  selectedUserGenderColor: { type: String, default: "" },
  selectedUserGenderIcon: { type: String, default: "" },
  selectedUserTitle: { type: String, default: "" },
  selectedUserSubtitle: { type: String, default: "" },
  selectedUserPresenceColor: { type: String, default: "default" },
  selectedUserPresenceIcon: { type: String, default: "" },
  selectedUserPresenceLabel: { type: String, default: "" },
  smAndDown: { type: Boolean, default: false },
});

defineEmits(["toggle"]);

const buttonClass = computed(() =>
  props.mobile
    ? "messages-sticky-header messages-sticky-header-button flex items-center justify-between px-3 py-2 md:hidden"
    : "profile-header profile-header-toggle flex items-center justify-between px-4 py-3"
);

const leftClass = computed(() =>
  props.mobile
    ? "mobile-profile-left flex items-center"
    : "profile-header-left flex items-center"
);

const avatarWrapClass = computed(() =>
  props.mobile
    ? "selected-avatar-wrap mobile-avatar-wrap"
    : "selected-avatar-wrap"
);

const avatarSize = computed(() => (props.mobile ? 46 : 50));

const decorationClass = computed(() =>
  props.mobile
    ? "selected-avatar-decoration mobile-avatar-decoration"
    : "selected-avatar-decoration"
);

const genderClass = computed(() =>
  props.mobile
    ? [
        "mdi",
        props.selectedUserGenderIcon,
        "selected-avatar-gender",
        "mobile-gender-icon",
        props.selectedUserGenderClass,
      ]
    : [
        "mdi",
        props.selectedUserGenderIcon,
        "selected-avatar-gender",
        props.selectedUserGenderClass,
      ]
);

const infoClass = computed(() =>
  props.mobile
    ? "mobile-profile-info ml-2 min-w-0"
    : "ml-3 min-w-0"
);

const titleClass = computed(() =>
  props.mobile
    ? [
        "text-sm font-medium",
        { truncate: props.smAndDown },
      ]
    : [
        "profile-header-title text-base font-medium",
        { truncate: props.smAndDown },
      ]
);

const subtitleClass = computed(() =>
  props.mobile
    ? "mobile-profile-subtitle text-sm text-medium-emphasis"
    : [
        "profile-header-subtitle text-sm text-medium-emphasis",
        { truncate: props.smAndDown },
      ]
);

const presenceToneClass = computed(() => {
  if (props.selectedUserPresenceColor === "success") {
    return "presence-pill--success";
  }
  if (props.selectedUserPresenceColor === "warning") {
    return "presence-pill--warning";
  }
  return "presence-pill--grey";
});

const desktopPresenceClass = computed(() => [
  "presence-pill mr-2 inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
  presenceToneClass.value,
]);

const mobilePresenceClass = computed(() => [
  "mobile-presence-pill presence-pill inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
  presenceToneClass.value,
]);

const iconClass = (icon, extra = "") => ["mdi", icon, extra].filter(Boolean);
</script>

<style scoped>
.profile-header-title,
.profile-header-subtitle {
  color: rgb(var(--color-heading)) !important;
}

.profile-header {
  gap: 0.9rem;
}

.profile-header-toggle {
  background: transparent;
  border: 0;
  width: 100%;
  text-align: left;
  border-radius: 0.85rem;
}

.profile-header-toggle:disabled {
  cursor: default;
  opacity: 0.58;
}

.messages-sticky-header-button {
  background: transparent;
  border: 0;
  width: 100%;
  text-align: left;
  color: rgb(var(--color-foreground));
  border-radius: 0.75rem;
}

.messages-sticky-header-button:disabled {
  cursor: default;
  opacity: 0.58;
}

.profile-header-left,
.mobile-profile-left {
  gap: 0.7rem;
  min-width: 0;
}

.profile-header-title {
  font-size: 0.98rem;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.profile-header-subtitle,
.mobile-profile-subtitle {
  color: rgb(var(--color-muted)) !important;
  font-size: 0.82rem;
  line-height: 1.35;
}

.mobile-profile-info {
  min-width: 0;
}

.selected-avatar-surface {
  border-radius: 999px;
  overflow: hidden;
  background: rgba(var(--color-surface-elevated), 0.88);
  border: 1px solid rgba(var(--color-border), 0.28);
  box-shadow: 0 10px 22px rgba(var(--color-shadow), 0.18);
}

.selected-avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.avatar-fallback {
  color: rgb(var(--color-foreground));
}

.selected-avatar-flag {
  box-shadow: 0 6px 14px rgba(var(--color-shadow), 0.18);
}

.header-chevron-btn {
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  border: 1px solid rgba(var(--color-border), 0.24);
  background: rgba(var(--color-surface), 0.76);
  color: rgb(var(--color-foreground));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background-color 140ms ease, border-color 140ms ease, transform 140ms ease;
}

.header-chevron-btn:hover:not(:disabled) {
  background: rgba(var(--color-surface-elevated), 0.96);
  border-color: rgba(var(--color-secondary), 0.32);
}

.header-chevron-btn:disabled {
  opacity: 0.55;
  cursor: default;
}

.presence-pill {
  border: 1px solid rgba(var(--color-border), 0.22);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.02);
}

.profile-header-actions {
  gap: 8px;
}

.header-chevron-btn {
  background: rgba(30, 41, 59, 0.62) !important;
  border: 1px solid rgba(148, 163, 184, 0.26);
  color: #e2e8f0 !important;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.header-chevron-btn:hover:not(:disabled) {
  background: rgba(51, 65, 85, 0.72) !important;
}

.header-chevron-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.presence-pill {
  color: #e2e8f0;
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.presence-pill--success {
  background: rgba(34, 197, 94, 0.18);
  border-color: rgba(34, 197, 94, 0.28);
}

.presence-pill--warning {
  background: rgba(245, 158, 11, 0.18);
  border-color: rgba(245, 158, 11, 0.3);
}

.presence-pill--grey {
  background: rgba(100, 116, 139, 0.24);
  border-color: rgba(148, 163, 184, 0.28);
}

.selected-avatar-surface {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.18);
  color: #c7d2fe;
  border: 1px solid rgba(129, 140, 248, 0.26);
}

.selected-avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-fallback {
  width: 100%;
  height: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-transform: uppercase;
}

.mobile-profile-info {
  min-width: 0;
}

.mobile-profile-subtitle {
  color: #cbd5e1 !important;
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mobile-presence-pill {
  margin-left: auto;
  margin-right: 8px;
}

.mobile-presence-pill :deep(.mdi),
.presence-pill :deep(.mdi),
.header-chevron-btn :deep(.mdi) {
  color: currentColor !important;
}

.selected-avatar-wrap {
  position: relative;
  display: inline-flex;
}

.selected-avatar-decoration {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 62px;
  height: 62px;
  pointer-events: none;
  z-index: 2;
}

.mobile-avatar-decoration {
  width: 56px;
  height: 56px;
}

.selected-avatar-flag {
  position: absolute;
  right: -6px;
  top: 2px;
  font-size: 1.22rem;
  line-height: 1;
  text-shadow: 0 1px 3px rgba(2, 6, 23, 0.75);
  z-index: 3;
}

.selected-avatar-gender {
  position: absolute;
  right: -5px;
  bottom: -5px;
  background: transparent;
  border-radius: 999px;
  padding: 4px;
  color: var(--selected-gender-color, #1d3b58) !important;
  z-index: 3;
  font-size: 20px;
  line-height: 1;
}

.selected-avatar-gender.is-male {
  color: var(--selected-gender-color, #3b82f6) !important;
}

.selected-avatar-gender.is-female {
  color: var(--selected-gender-color, #ec4899) !important;
}

.selected-avatar-gender.is-other {
  color: var(--selected-gender-color, #a855f7) !important;
}
</style>
