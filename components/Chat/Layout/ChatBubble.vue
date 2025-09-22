<template>
  <div class="my-1" :class="fromMe ? 'text-right' : 'text-left'">
    <div
      class="inline-block rounded-xl px-3 py-2 max-w-[80%] align-top"
      :class="fromMe ? 'bg-blue-lighten-4 text-black' : 'bg-blue-grey-lighten-3 text-black'"
    >
      <div class="whitespace-pre-wrap break-words text-body-2" v-html="html"></div>
      <div class="opacity-60 text-caption mt-1">{{ time }}</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  fromMe: { type: Boolean, default: false },
  html: { type: String, default: "" }, // already rendered/ sanitized
  time: { type: String, default: "" },
});
</script>