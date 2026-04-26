<template>
  <div class="settings-profile-form">
    <section class="settings-zone-card settings-zone-card--data">
      <div class="settings-zone-card__body settings-zone-card__body--compact">
        <div class="grid grid-cols-1 gap-x-2 gap-y-0 sm:grid-cols-2 md:grid-cols-3">
          <div class="px-1 py-0">
            <SettingsProfileDisplayName2
              :displayName="props.userProfile.displayname"
              :isEditable="props.isEditable"
              @updateDisplayName="(val) => emit('update:displayName', val)"
              @validation="(val) => emit('validation', val)"
            />
          </div>
          <div class="px-1 py-0">
            <SettingsProfileTagLine
              :tagLine="props.userProfile.tagline ?? '...'"
              :isEditable="props.isEditable"
              :errorMessage="props.tagLineErrorMessage"
              @updateTagLine="(val) => emit('update:tagLine', val)"
            />
          </div>
          <div class="px-1 py-0">
            <SettingsProfileLanguage
              :selectedLocale="props.userProfile.preferred_locale ?? 'en'"
              :locales="props.locales"
              :isEditable="props.isEditable"
              @updateLocale="(val) => emit('update:preferredLocale', val)"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 gap-x-2 gap-y-0 sm:grid-cols-2 md:grid-cols-3">
          <div class="px-1 py-0">
            <SettingsProfileStatus
              :selectedStatus="props.userProfile?.status_id ?? 1"
              :statuses="props.statuses"
              :isEditable="props.isEditable"
              @updateStatus="(val) => emit('update:statusId', val)"
            />
          </div>
          <div class="px-1 py-0">
            <SettingsProfileGender
              :genderId="props.userProfile.gender_id ?? 1"
              :genders="props.genders"
              :isEditable="props.isEditable"
              @updateGenderId="(val) => emit('update:genderId', val)"
              @validation="(val) => emit('validation', val)"
            />
          </div>
          <div class="px-1 py-0">
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

        <div class="grid grid-cols-1 gap-x-2 gap-y-0 sm:grid-cols-2">
          <div class="px-1 py-0">
            <label class="settings-field">
              <span class="settings-field__label">{{ t("components.presence.label") }}</span>
              <select
                :disabled="props.presenceDisabled"
                class="settings-field__control"
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
              class="settings-field__meta"
            >
              {{ t("components.settings-container.loading") }}
            </p>
          </div>
          <div class="px-1 py-0">
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
                class="settings-action-btn settings-action-btn--primary"
                @click="emit('save')"
              >
                Save
              </button>
              <button
                type="button"
                class="settings-action-btn settings-action-btn--secondary"
                @click="emit('cancelEdit')"
              >
                Cancel
              </button>
            </template>
            <template v-else>
              <button
                v-if="props.showTranslateButton"
                type="button"
                class="settings-action-btn settings-action-btn--ghost"
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
                class="settings-action-btn settings-action-btn--primary"
                @click="emit('startEdit')"
              >
                Edit
              </button>
              <NuxtLink
                to="/chat"
                class="settings-action-btn settings-action-btn--primary"
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

.settings-zone-card {
  border-radius: 12px;
  border: 1px solid rgb(var(--color-border) / 0.72);
  background: rgb(var(--color-surface) / 0.96);
  color: rgb(var(--color-foreground));
}

.settings-zone-card__body {
  padding: 0.75rem 0.5rem 0.6rem;
}

.settings-zone-card__body--bio {
  padding-inline: 0.75rem;
}

.settings-field {
  display: grid;
  gap: 0.35rem;
}

.settings-field__label {
  color: rgb(var(--color-foreground) / 0.82);
  font-size: 0.9rem;
  font-weight: 600;
}

.settings-field__control {
  width: 100%;
  min-height: 2.75rem;
  border: 1px solid rgb(var(--color-border) / 0.82);
  border-radius: 12px;
  background: rgb(var(--color-surface));
  color: rgb(var(--color-foreground));
  padding: 0.7rem 0.85rem;
  font-size: 0.95rem;
  color-scheme: light dark;
}

.settings-field__control:disabled {
  opacity: 1;
  cursor: default;
  background: rgb(var(--color-surface) / 0.76);
  color: rgb(var(--color-foreground) / 0.62);
}

.settings-field__meta {
  margin-top: 0.35rem;
  color: rgb(var(--color-foreground) / 0.58);
  font-size: 0.8rem;
}

.settings-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border-radius: 999px;
  padding: 0.6rem 1rem;
  border: 1px solid transparent;
  font-size: 0.92rem;
  font-weight: 600;
  text-decoration: none;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.settings-action-btn:disabled {
  opacity: 0.65;
  cursor: default;
}

.settings-action-btn--primary {
  background: rgb(var(--color-primary));
  border-color: rgb(var(--color-primary));
  color: rgb(var(--color-background));
}

.settings-action-btn--secondary {
  background: transparent;
  border-color: rgb(var(--color-border) / 0.72);
  color: rgb(var(--color-foreground));
}

.settings-action-btn--ghost {
  background: rgb(var(--color-primary) / 0.12);
  border-color: transparent;
  color: rgb(var(--color-primary));
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
    padding-inline: 0.75rem;
  }

  .settings-zone-card__body--bio {
    padding-inline: 1rem;
  }
}
</style>
