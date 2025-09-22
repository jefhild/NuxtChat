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
  background: rgba(0, 0, 0, 0.06);
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  display: inline-block;
  animation: blink 1.2s infinite;
}

.dot:nth-child(1) { animation-delay: 0s; }
.dot:nth-child(2) { animation-delay: 0.15s; }
.dot:nth-child(3) { animation-delay: 0.3s; }

.typing-label {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.55);
}

@keyframes blink {
  0%, 80%, 100% { opacity: 0.25; }
  40% { opacity: 1; }
}
</style>