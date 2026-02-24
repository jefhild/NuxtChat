<template>
  <div class="typing-chip">
    <span class="dot"></span>
    <span class="dot"></span>
    <span class="dot"></span>
    <span class="typing-label">Typing…</span>
  </div>
</template>

<script setup>
// purely visual
</script>

<style scoped>
.typing-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.22);
  border: 1px solid rgba(148, 163, 184, 0.35);
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(226, 232, 240, 0.9);
  display: inline-block;
  animation: blink 1.2s infinite;
}

.dot:nth-child(1) { animation-delay: 0s; }
.dot:nth-child(2) { animation-delay: 0.15s; }
.dot:nth-child(3) { animation-delay: 0.3s; }

.typing-label {
  font-size: 12px;
  color: rgba(226, 232, 240, 0.95);
}

@keyframes blink {
  0%, 80%, 100% { opacity: 0.25; }
  40% { opacity: 1; }
}
</style>
