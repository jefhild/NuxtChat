<template>
  <v-card
    class="d-flex flex-column"
    :color="color"
    :rounded="rounded"
    :flat="flat"
  >
    <template v-if="isAuthed">
      <!-- Compact header: avatar (optional) + settings -->
      <div class="d-flex align-center justify-space-between px-2 pt-2">
        <div class="d-flex align-center gap-2 text-primary">
          <!-- optional avatar when authed and we have a profile -->
          <v-avatar
            v-if="isAuthed && userProfile && userProfile.avatar_url"
            size="28"
            :image="userProfile.avatar_url"
            class="mr-1"
          />
          {{ userProfile.displayname }}
        </div>

        <v-tooltip
          :text="
            isAuthed
              ? t('components.chatheader.settings')
              : t('components.chatheader.settings-disabled')
          "
          location="bottom"
        >
          <template #activator="{ props: tip }">
            <v-btn
              v-bind="tip"
              icon
              variant="text"
              density="comfortable"
              :to="isAuthed ? settingsTo : undefined"
              :disabled="!isAuthed"
              :aria-disabled="String(!isAuthed)"
              :aria-label="
                isAuthed
                  ? `${t(
                      'components.chatheader.settings-aria-label'
                    )} ${displayName}`
                  : t('components.chatheader.settings-disabled')
              "
              :ripple="isAuthed"
            >
              <v-icon
                class="mb-1 opacity-60"
                color="primary"
                icon="mdi-cog-outline"
              />
            </v-btn>
          </template>
        </v-tooltip>
      </div>
    </template>

    <!-- Line 1: clickable / link-like text -->
    <template v-if="!isAuthed">
      <div class="ml-2">
        <template v-if="clickable">
          <v-btn
            variant="text"
            color="primary"
            class="text-subtitle-2 font-weight-medium px-0 text-decoration-underline"
            :aria-label="actionLabel || t('components.chatheader.action-label')"
            @click="$emit('action')"
          >
            {{ line1Text }}
          </v-btn>
        </template>
        <template v-else>
          <div class="text-subtitle-2 font-weight-medium">
            {{ line1Text }}
          </div>
        </template>
      </div>

      <!-- Line 2: caption -->
      <div class="ml-2 mb-2 text-caption text-medium-emphasis">
        {{ line2Text }}
      </div>
    </template>
  </v-card>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";

/**
 * Supports your key format:
 * components.chatheader.{authStatus}-line1
 * components.chatheader.{authStatus}-line2
 */
const props = defineProps({
  authStatus: { type: String, default: "unauthenticated" }, // e.g. 'authenticated', 'unauthenticated', 'loading'
  line1: { type: String, default: null }, // optional manual override
  line2: { type: String, default: null },
  clickable: { type: Boolean, default: true },
  actionLabel: { type: String, default: "" },
  color: { type: String, default: "grey-lighten-4" },
  rounded: { type: [Boolean, String, Number], default: "lg" },
  flat: { type: Boolean, default: true },
  userProfile: { type: Object, default: null },
  settingsTo: { type: String, default: "/settings" },
});

defineEmits(["action"]);

const { t } = useI18n();

const isAuthed = computed(() => props.authStatus === "authenticated");
const displayName = computed(
  () => props.userProfile?.displayname || props.userProfile?.username || ""
);

// Fallback to localized strings if props.line1/line2 aren’t provided
const line1Text = computed(() => {
  return props.line1 || t(`components.chatheader.${props.authStatus}-line1`);
});

const line2Text = computed(() => {
  return props.line2 || t(`components.chatheader.${props.authStatus}-line2`);
});
</script>

<style scoped>
.text-decoration-underline {
  text-decoration: underline;
}
</style>
