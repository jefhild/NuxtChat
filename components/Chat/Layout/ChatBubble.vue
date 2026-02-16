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
  max-width: min(100%, 900px);
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
  color: #94a3b8;
  font-size: 12px;
  line-height: 1.2;
}
.bubble-meta__text {
  display: flex;
  gap: 8px;
}
.bubble-name {
  font-weight: 600;
  color: #cbd5e1;
}
.bubble-time {
  color: #94a3b8;
  opacity: 0.9;
}

.bubble {
  position: relative;
  padding: 10px 12px;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
  background: #334155;
  color: #e2e8f0;
  box-shadow: 0 6px 16px rgba(2, 6, 23, 0.28);
  transition: transform 120ms ease, box-shadow 120ms ease;
}
.bubble--me {
  background: linear-gradient(145deg, #2563eb, #1d4ed8);
  color: #eff6ff;
  border-bottom-right-radius: 4px;
}
.bubble--them {
  background: #334155;
  color: #e2e8f0;
  border-bottom-left-radius: 4px;
}
.bubble:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 20px rgba(2, 6, 23, 0.34);
}
.bubble :deep(a) {
  color: #bfdbfe;
  text-decoration: underline;
  text-decoration-color: rgba(191, 219, 254, 0.45);
}
.bubble :deep(hr) {
  border: 0;
  border-top: 1px dashed rgba(148, 163, 184, 0.35);
  margin: 8px 0;
}

.bubble-status {
  margin-top: 2px;
  font-size: 12px;
  color: #94a3b8;
  opacity: 0.9;
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
