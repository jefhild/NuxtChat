// /stores/typingStore.js
import { defineStore } from "pinia";
import { ref } from "vue";

export const useTypingStore = defineStore("typing", () => {
  // Map<peerId, boolean>
  const typingByPeer = ref({});

  function set(peerId, isTyping) {
    if (!peerId) return;
    typingByPeer.value = { ...typingByPeer.value, [peerId]: !!isTyping };
  }

  function clear(peerId) {
    if (!peerId) return;
    const copy = { ...typingByPeer.value };
    delete copy[peerId];
    typingByPeer.value = copy;
  }

  function isTyping(peerId) {
    return !!typingByPeer.value[peerId];
  }

  function reset() {
    typingByPeer.value = {};
  }

  return { typingByPeer, set, clear, isTyping, reset };
});
