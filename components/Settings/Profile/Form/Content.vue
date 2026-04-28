<template>
  <div
    class="settings-profile-form"
    :class="props.isEditable ? 'settings-profile-form--editing' : 'settings-profile-form--readonly'"
  >
    <div class="settings-mode-bar">
      <div
        class="settings-mode-pill"
        :class="props.isEditable ? 'settings-mode-pill--editing' : 'settings-mode-pill--readonly'"
      >
        <i
          class="mdi settings-mode-pill__icon"
          :class="props.isEditable ? 'mdi-pencil' : 'mdi-eye-outline'"
          aria-hidden="true"
        />
        {{ props.isEditable ? t("components.profile-form.mode-editing") : t("components.profile-form.mode-readonly") }}
      </div>
      <p class="settings-mode-copy">
        {{ props.isEditable ? t("components.profile-form.mode-editing-copy") : t("components.profile-form.mode-readonly-copy") }}
      </p>
    </div>
    <section class="settings-zone-card settings-zone-card--data">
      <div class="settings-zone-card__body settings-zone-card__body--compact">
        <div class="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2 md:grid-cols-3">
          <div class="px-1 py-1">
            <SettingsProfileDisplayName2
              :displayName="props.userProfile.displayname"
              :isEditable="props.isEditable"
              @updateDisplayName="(val) => emit('update:displayName', val)"
              @validation="(val) => emit('validation', val)"
            />
          </div>
          <div class="px-1 py-1">
            <SettingsProfileTagLine
              :tagLine="props.userProfile.tagline ?? '...'"
              :isEditable="props.isEditable"
              :errorMessage="props.tagLineErrorMessage"
              @updateTagLine="(val) => emit('update:tagLine', val)"
            />
          </div>
          <div class="px-1 py-1">
            <SettingsProfileLanguage
              :selectedLocale="props.userProfile.preferred_locale ?? 'en'"
              :locales="props.locales"
              :isEditable="props.isEditable"
              @updateLocale="(val) => emit('update:preferredLocale', val)"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2 md:grid-cols-3">
          <div class="px-1 py-1">
            <SettingsProfileStatus
              :selectedStatus="props.userProfile?.status_id ?? 1"
              :statuses="props.statuses"
              :isEditable="props.isEditable"
              @updateStatus="(val) => emit('update:statusId', val)"
            />
          </div>
          <div class="px-1 py-1">
            <SettingsProfileGender
              :genderId="props.userProfile.gender_id ?? 1"
              :genders="props.genders"
              :isEditable="props.isEditable"
              @updateGenderId="(val) => emit('update:genderId', val)"
              @validation="(val) => emit('validation', val)"
            />
          </div>
          <div class="px-1 py-1">
            <SettingsProfileAge
              :age="props.userProfile.age ?? 18"
              :isEditable="props.isEditable"
              @updateAge="(val) => emit('update:age', val)"
            />
          </div>
        </div>

        <div class="grid grid-cols-1">
          <div>
            <SettingsProfileLocation
              v-bind="locationProps"
              :isEditable="props.isEditable"
              @updateCountry="(val) => emit('update:country', val)"
              @updateState="(val) => emit('update:state', val)"
              @updateCity="(val) => emit('update:city', val)"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2">
          <div class="px-1 py-1">
            <label class="ui-settings-field">
              <span class="ui-settings-field__label">{{ t("components.presence.label") }}</span>
              <select
                :disabled="props.presenceDisabled"
                class="ui-settings-field__control"
                :value="props.presenceStatus"
                @change="emit('update:presenceStatus', $event.target.value)"
              >
                <option
                  v-for="option in presenceOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </label>
            <p
              v-if="props.presenceLoading"
              class="ui-settings-field__meta"
            >
              {{ t("components.settings-container.loading") }}
            </p>
          </div>
          <div class="px-1 py-1">
            <SettingsProfileSite
              :siteUrl="props.userProfile.site_url ?? ''"
              :isEditable="props.isSiteEditable"
              @updateSite="(val) => emit('update:siteUrl', val)"
            />
          </div>
        </div>
      </div>
    </section>

    <section class="settings-zone-card settings-zone-card--bio mt-3">
      <div class="settings-zone-card__body settings-zone-card__body--bio">
        <div class="grid grid-cols-1">
          <div>
            <SettingsProfileBio
              :bio="userProfile.bio ?? ''"
              :isEditable="props.isEditable"
              :minLength="props.bioMinLength"
              :errorMessage="props.bioErrorMessage"
              :showAiButton="props.showAiBioButton"
              :aiDisabled="props.aiBioDisabled"
              :aiLoading="props.aiBioLoading"
              :aiRemaining="props.aiBioRemaining"
              @openAiBio="emit('openAiBio')"
              @updateBio="(val) => emit('update:bio', val)"
            />
          </div>
        </div>
        <div class="mt-2 flex justify-end">
          <div class="flex flex-wrap justify-end gap-2">
            <template v-if="props.isEditable">
              <button
                type="button"
                class="ui-settings-btn ui-settings-btn--primary"
                @click="emit('save')"
              >
                Save
              </button>
              <button
                type="button"
                class="ui-settings-btn ui-settings-btn--secondary"
                @click="emit('cancelEdit')"
              >
                Cancel
              </button>
            </template>
            <template v-else>
              <button
                v-if="props.showTranslateButton"
                type="button"
                class="ui-settings-btn ui-settings-btn--ghost"
                :disabled="props.translateLoading"
                @click="emit('translateProfile')"
              >
                <i
                  v-if="props.translateLoading"
                  class="mdi mdi-loading settings-action-btn__spinner"
                  aria-hidden="true"
                />
                Translate profile text
              </button>
              <button
                type="button"
                class="ui-settings-btn ui-settings-btn--primary"
                @click="emit('startEdit')"
              >
                Edit
              </button>
              <NuxtLink
                to="/chat"
                class="ui-settings-btn ui-settings-btn--primary"
              >
                Back To Chat
              </NuxtLink>
            </template>
          </div>
        </div>
        <div
          v-if="props.translateStatus && !props.isEditable"
          class="mt-2"
        >
          <div
            class="settings-status-alert"
            :class="props.translateError ? 'settings-status-alert--error' : 'settings-status-alert--success'"
          >
            {{ props.translateStatus }}
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { useI18n } from "vue-i18n";

const props = defineProps({
  locationProps: Object,
  userProfile: Object,
  isEditable: Boolean,
  isSiteEditable: Boolean,
  statuses: Array,
  genders: Array,
  locales: Array,
  presenceStatus: {
    type: String,
    default: "auto",
  },
  presenceDisabled: {
    type: Boolean,
    default: false,
  },
  presenceLoading: {
    type: Boolean,
    default: false,
  },
  isMarkedForDeletion: {
    type: Boolean,
    default: false,
  },
  deleteBusy: {
    type: Boolean,
    default: false,
  },
  showEmailLinkPrompt: {
    type: Boolean,
    default: false,
  },
  showAiBioButton: {
    type: Boolean,
    default: false,
  },
  aiBioDisabled: {
    type: Boolean,
    default: false,
  },
  aiBioLoading: {
    type: Boolean,
    default: false,
  },
  aiBioRemaining: {
    type: Number,
    default: 0,
  },
  bioMinLength: {
    type: Number,
    default: 0,
  },
  bioErrorMessage: {
    type: String,
    default: "",
  },
  tagLineErrorMessage: {
    type: String,
    default: "",
  },
  showTranslateButton: {
    type: Boolean,
    default: false,
  },
  translateLoading: {
    type: Boolean,
    default: false,
  },
  translateStatus: {
    type: String,
    default: "",
  },
  translateError: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  "update:displayName",
  "update:tagLine",
  "update:siteUrl",
  "update:statusId",
  "update:age",
  "update:genderId",
  "update:country",
  "update:state",
  "update:city",
  "update:preferredLocale",
  "update:presenceStatus",
  "update:bio",
  "validation",
  "save",
  "cancelEdit",
  "startEdit",
  "toggleDeletionMark",
  "linkAnonEmail",
  "openAiBio",
  "translateProfile",
]);

const { t } = useI18n();

const presenceOptions = [
  { label: t("components.presence.auto"), value: "auto" },
  { label: t("components.presence.away"), value: "away" },
  { label: t("components.presence.offline"), value: "offline" },
];

</script>

<style scoped>
.text-link-btn {
  padding: 0;
  min-width: 0;
  background: none;
  border: none;
  box-shadow: none;
  color: #007bff;
  cursor: pointer;
  text-decoration: none;
  font-size: inherit;
  text-transform: none;
}

.text-link-btn:hover {
  text-decoration: underline;
}

.settings-profile-form {
  padding-top: 0;
  padding-bottom: 0;
  margin-top: 6px;
}

.settings-mode-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.55rem 0.8rem;
  padding: 0 0.35rem 0.75rem;
}

.settings-mode-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 2rem;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  border: 1px solid transparent;
  font-family: "Poppins", sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.01em;
}

.settings-mode-pill--editing {
  background: rgb(var(--color-primary) / 0.14);
  border-color: rgb(var(--color-secondary) / 0.28);
  color: rgb(var(--color-secondary));
}

.settings-mode-pill--readonly {
  background: rgb(var(--color-surface-elevated) / 0.72);
  border-color: rgb(var(--color-border) / 0.7);
  color: rgb(var(--color-muted));
}

.settings-mode-pill__icon {
  font-size: 0.95rem;
  line-height: 1;
}

.settings-mode-copy {
  margin: 0;
  color: rgb(var(--color-muted));
  font-size: 0.82rem;
  line-height: 1.45;
}

.settings-zone-card {
  border-radius: 16px;
  border: 1px solid rgb(var(--color-border) / 0.72);
  background: linear-gradient(
    180deg,
    rgb(var(--color-surface) / 0.98),
    rgb(var(--color-surface-elevated) / 0.94)
  );
  color: rgb(var(--color-foreground));
  box-shadow: 0 14px 32px rgb(var(--color-shadow) / 0.08);
}

.settings-profile-form--editing .settings-zone-card {
  border-color: rgb(var(--color-secondary) / 0.38);
  background: linear-gradient(
    180deg,
    rgb(var(--color-surface-elevated) / 0.98),
    rgb(var(--color-surface-elevated) / 0.94)
  );
  box-shadow:
    0 18px 36px rgb(var(--color-shadow) / 0.12),
    0 0 0 1px rgb(var(--color-secondary) / 0.16);
}

.settings-profile-form--readonly .settings-zone-card {
  background: rgb(var(--color-surface) / 0.94);
}

.settings-profile-form--readonly :deep(.ui-settings-field__label) {
  color: rgb(var(--color-muted) / 0.76);
}

.settings-profile-form--readonly :deep(.ui-settings-field__control) {
  background: rgb(var(--color-surface) / 0.5);
  border-color: rgb(var(--color-border) / 0.52);
  color: rgb(var(--color-foreground) / 0.72);
}

.settings-profile-form--editing :deep(.ui-settings-field__label) {
  color: rgb(var(--color-secondary));
}

.settings-profile-form--editing :deep(.ui-settings-field__control) {
  background: rgb(var(--color-surface-elevated) / 0.96);
  border-color: rgb(var(--color-secondary) / 0.34);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.04),
    0 8px 18px rgb(var(--color-shadow) / 0.1);
}

.settings-profile-form--editing .settings-mode-pill--editing {
  background: rgb(var(--color-primary) / 0.22);
  border-color: rgb(var(--color-secondary) / 0.44);
  color: rgb(var(--color-heading));
  box-shadow:
    0 10px 22px rgb(var(--color-shadow) / 0.12),
    0 0 0 1px rgb(var(--color-secondary) / 0.12);
}

.settings-profile-form--editing .settings-mode-copy {
  color: rgb(var(--color-secondary) / 0.92);
}

.settings-zone-card__body {
  padding: 0.85rem 0.55rem 0.65rem;
}

.settings-zone-card__body--bio {
  padding-inline: 0.85rem;
}

.settings-action-btn__spinner {
  animation: settings-spin 0.8s linear infinite;
}

.settings-status-alert {
  border-radius: 0.85rem;
  padding: 0.75rem 0.9rem;
  font-size: 0.9rem;
  border: 1px solid transparent;
}

.settings-status-alert--success {
  background: rgb(var(--color-success) / 0.12);
  border-color: rgb(var(--color-success) / 0.24);
  color: rgb(var(--color-success));
}

.settings-status-alert--error {
  background: rgb(var(--color-danger) / 0.12);
  border-color: rgb(var(--color-danger) / 0.24);
  color: rgb(var(--color-danger));
}

.settings-delete-btn {
  letter-spacing: 0.02em;
}

@keyframes settings-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (min-width: 768px) {
  .settings-zone-card__body {
    padding: 0.95rem 0.75rem 0.8rem;
  }

  .settings-zone-card__body--bio {
    padding-inline: 0.95rem;
  }
}
</style>
