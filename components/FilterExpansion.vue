<template>
  <v-expansion-panels
    v-model="panelBinding"
    :variant="variant"
    :class="['my-2', 'compact-panel', panelsClass]"
    :multiple="false"
  >
    <v-expansion-panel>
      <v-expansion-panel-title>
        <span>{{ selectedName || title }}</span>
      </v-expansion-panel-title>

      <v-expansion-panel-text>
        <div v-if="scrollingList" class="scrolling-list">
          <v-list density="compact">
            <v-list-item
              v-for="item in items"
              :key="item.slug"
              :value="item.slug"
              @click="navigate(item.slug)"
            >
              <div
                class="d-block text-decoration-none font-weight-medium"
                :class="{ 'text-primary': isActive(item.slug) }"
              >
                {{ item.name }}
              </div>
            </v-list-item>
          </v-list>
        </div>
        <v-row v-else no-gutters>
          <v-col
            v-for="item in items"
            :key="item.slug"
            cols="auto"
            class="my-1 mx-3"
          >
            <NuxtLink
              :to="linkFor(item.slug)"
              :class="[
                'text-decoration-none font-weight-medium',
                { 'text-primary': isActive(item.slug) }
              ]"
            >
              {{ item.name }}
            </NuxtLink>
          </v-col>
        </v-row>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script setup>
const props = defineProps({
  title: { type: String, required: true },
  selectedName: { type: String, default: '' },
  items: { type: Array, required: true },            // [{ slug, name }]
  basePath: { type: String, required: true },         // "/categories" | "/tags"
  selectedSlug: { type: String, default: null },      // used on listing pages
  activeSlugs: { type: Array, default: () => [] },    // used on article page (multi)
  allSlug: { type: String, default: 'all' },
  variant: { type: String, default: 'inset' },
  panelsClass: { type: String, default: '' },
  scrollingList: { type: Boolean, default: false },
  modelValue: { type: String, default: null },        // shared open panel key
  panelKey: { type: String, default: '' },            // unique key per panel
})

const emit = defineEmits(['update:modelValue'])

const router = useRouter()
const route = useRoute()
const localPath = useLocalePath()
const internalPanel = ref(null)

// Bind panel open state so only one panel (shared via modelValue) stays open
const panelBinding = computed({
  get() {
    if (props.panelKey) return props.modelValue === props.panelKey ? 0 : null
    return internalPanel.value
  },
  set(val) {
    if (props.panelKey) {
      const isClosed =
        val === null ||
        (Array.isArray(val) && val.length === 0) ||
        val === undefined
      const next = isClosed ? null : props.panelKey
      emit('update:modelValue', next)
    } else {
      internalPanel.value = val
    }
  },
})

const linkFor = (slug) =>
  slug === props.allSlug ? localPath(props.basePath) : localPath(`${props.basePath}/${slug}`)

const isActive = (slug) =>
  props.activeSlugs.includes(slug) ||
  props.selectedSlug === slug ||
  (!props.selectedSlug && slug === props.allSlug)

const navigate = (slug) => {
  const target = linkFor(slug)
  router.push(target)
}
</script>

<style scoped>
.compact-panel .v-expansion-panel-title {
  padding-top: 2px !important;
  padding-bottom: 2px !important;
  min-height: 28px !important;
  font-size: 0.9rem;
}
.compact-panel .v-expansion-panel-text__wrapper {
  padding-top: 2px !important;
  padding-bottom: 2px !important;
}

.compact-panel :deep(.v-list-item) {
  min-height: 28px;
  padding: 0 6px;
}

.compact-panel :deep(.v-list-item .font-weight-medium) {
  font-size: 0.85rem;
  line-height: 1.2;
}

.scrolling-list {
  max-height: 240px;
  overflow-y: auto;
}
</style>
