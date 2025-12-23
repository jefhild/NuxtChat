<template>
  <div
    class="bubble-row"
    :class="fromMe ? 'bubble-row--me' : 'bubble-row--them'"
  >
    <div v-if="showMeta && (nameToShow || time || avatar)" class="bubble-meta">
      <v-avatar v-if="avatar" size="26" class="bubble-avatar">
        <v-img :src="avatar" cover />
      </v-avatar>
      <div class="bubble-meta__text">
        <div v-if="nameToShow" class="bubble-name">
          {{ nameToShow }}
        </div>
        <div v-if="time" class="bubble-time">{{ time }}</div>
      </div>
    </div>

    <transition name="bubble-fade">
      <div
        class="bubble"
        :class="fromMe ? 'bubble--me' : 'bubble--them'"
        v-html="html"
      ></div>
    </transition>

    <div v-if="status" class="bubble-status">{{ status }}</div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  fromMe: { type: Boolean, default: false },
  html: { type: String, default: "" }, // already rendered/ sanitized
  time: { type: String, default: "" },
  name: { type: String, default: "" },
  avatar: { type: String, default: "" },
  status: { type: String, default: "" }, // e.g. Seen, Sent
  showMeta: { type: Boolean, default: true },
});

const nameToShow = computed(() =>
  props.name || (props.fromMe ? "me" : "")
);
</script>

<style scoped>
.bubble-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 10px 0;
  max-width: 72ch;
}
.bubble-row--me {
  margin-left: auto;
  align-items: flex-end;
}
.bubble-row--them {
  margin-right: auto;
  align-items: flex-start;
}

.bubble-meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: rgba(0, 0, 0, 0.55);
  font-size: 12px;
  line-height: 1.2;
}
.bubble-meta__text {
  display: flex;
  gap: 8px;
}
.bubble-name {
  font-weight: 600;
}
.bubble-time {
  opacity: 0.7;
}

.bubble {
  position: relative;
  padding: 10px 12px;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
  background: #f5f6f8;
  color: #0f1f3a;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  transition: transform 120ms ease, box-shadow 120ms ease;
}
.bubble--me {
  background: linear-gradient(145deg, #e3f2ff, #d5e9ff);
  color: #0f1f3a;
  border-bottom-right-radius: 4px;
}
.bubble--them {
  background: #f5f6f8;
  color: #0f1f3a;
  border-bottom-left-radius: 4px;
}
.bubble:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.08);
}
.bubble :deep(a) {
  color: inherit;
  text-decoration: underline;
  text-decoration-color: rgba(0, 0, 0, 0.35);
}
.bubble :deep(hr) {
  border: 0;
  border-top: 1px dashed rgba(15, 31, 58, 0.25);
  margin: 8px 0;
}

.bubble-status {
  margin-top: 2px;
  font-size: 12px;
  opacity: 0.6;
}

.bubble-avatar :deep(img) {
  object-fit: cover;
}

.bubble-fade-enter-active {
  transition: all 140ms ease;
}
.bubble-fade-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
</style>
