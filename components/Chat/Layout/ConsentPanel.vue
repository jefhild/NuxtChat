<template>
  <v-card
    class="d-flex flex-column"
    :color="color"
    :rounded="rounded"
    :flat="flat"
  >
    <!-- Line 1: clickable / link-like text -->
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
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * Supports your key format:
 * components.chatheader.{authStatus}-line1
 * components.chatheader.{authStatus}-line2
 */
const props = defineProps({
  authStatus: { type: String, default: 'unauthenticated' }, // e.g. 'authenticated', 'unauthenticated', 'loading'
  line1: { type: String, default: null }, // optional manual override
  line2: { type: String, default: null },
  clickable: { type: Boolean, default: true },
  actionLabel: { type: String, default: '' },
  color: { type: String, default: 'grey-lighten-4' },
  rounded: { type: [Boolean, String, Number], default: 'lg' },
  flat: { type: Boolean, default: true },
})

defineEmits(['action'])

const { t } = useI18n()

// Fallback to localized strings if props.line1/line2 aren’t provided
const line1Text = computed(() => {
  return (
    props.line1 ||
    t(`components.chatheader.${props.authStatus}-line1`)
  )
})

const line2Text = computed(() => {
  return (
    props.line2 ||
    t(`components.chatheader.${props.authStatus}-line2`)
  )
})
</script>

<style scoped>
.text-decoration-underline {
  text-decoration: underline;
}
</style>