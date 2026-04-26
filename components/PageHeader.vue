<template>
  <div class="mb-2 text-center">
    <div class="flex items-center gap-2">
      <div
        v-if="$slots.start"
        class="flex min-w-8 items-center justify-start"
      >
        <slot name="start" />
      </div>
      <div class="flex flex-1 justify-center">
        <div class="inline-flex items-center gap-2.5">
          <span v-if="$slots.icon" class="page-header-icon">
            <slot name="icon" />
          </span>
          <h1
            class="font-poppins text-xl font-semibold text-foreground sm:text-2xl md:text-3xl"
          >
            {{ text }}
          </h1>
        </div>
      </div>
      <div
        v-if="$slots.end"
        class="flex min-w-8 items-center justify-end"
      >
        <slot name="end" />
      </div>
    </div>
    <h2
      v-if="subtitle"
      class="mt-0 hidden text-base font-normal text-foreground/70 md:block md:text-xl"
    >
      {{ subtitle }}
    </h2>
  </div>
</template>

<script setup>
defineProps({
  text: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    default: "",
  },
});
</script>

<style scoped>
.page-header-icon :deep(.v-icon) {
  color: rgb(var(--color-primary));
}
</style>
