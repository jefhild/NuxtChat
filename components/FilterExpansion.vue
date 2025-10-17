<template>
  <v-expansion-panels :variant="variant" :class="['my-2', 'compact-panel', panelsClass]">
    <v-expansion-panel>
      <v-expansion-panel-title>
        <span>{{ selectedName || title }}</span>
      </v-expansion-panel-title>

      <v-expansion-panel-text>
        <v-row no-gutters>
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
})

const route = useRoute()
const localPath = useLocalePath()

const linkFor = (slug) =>
  slug === props.allSlug ? localPath(props.basePath) : localPath(`${props.basePath}/${slug}`)

const isActive = (slug) =>
  props.activeSlugs.includes(slug) ||
  props.selectedSlug === slug ||
  (!props.selectedSlug && slug === props.allSlug)
</script>

<style scoped>
.compact-panel .v-expansion-panel-title {
  padding-top: 4px !important;
  padding-bottom: 4px !important;
  min-height: 32px !important;
}
.compact-panel .v-expansion-panel-text__wrapper {
  padding-top: 4px !important;
  padding-bottom: 4px !important;
}
</style>