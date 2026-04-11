<template>
  <div v-if="users.length >= 4" class="ticker-bar" aria-hidden="true">
    <div class="ticker-label">
      <span class="ticker-dot" />
    </div>
    <div class="ticker-viewport">
      <div
        class="ticker-track"
        :style="trackStyle"
        @mouseenter="paused = true"
        @mouseleave="paused = false"
      >
        <div
          v-for="(user, i) in doubledUsers"
          :key="`${user.id}-${i}`"
          class="ticker-chip"
          role="button"
          tabindex="-1"
          @click="openProfile(user)"
        >
          <div
            class="avatar-ring"
            :class="genderRingClass(user.gender_id)"
          >
            <img
              v-if="user.avatar_url"
              :src="user.avatar_url"
              :alt="user.displayname"
              class="avatar-img"
            >
            <span v-else class="avatar-initial">
              {{ user.displayname.charAt(0).toUpperCase() }}
            </span>
          </div>
          <span class="ticker-name">{{ user.displayname }}</span>
        </div>
      </div>
    </div>

    <ProfileDialog
      v-if="selectedUserId"
      v-model="isProfileDialogOpen"
      :user-id="selectedUserId"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import ProfileDialog from "@/components/ProfileDialog.vue";

const users = ref([]);
const paused = ref(false);
const isProfileDialogOpen = ref(false);
const selectedUserId = ref(null);

const SPEED_PX_PER_S = 45;
const APPROX_CHIP_PX = 148;

const doubledUsers = computed(() => [...users.value, ...users.value]);

const trackStyle = computed(() => {
  const duration = (users.value.length * APPROX_CHIP_PX) / SPEED_PX_PER_S;
  return {
    "--ticker-duration": `${Math.max(duration, 12).toFixed(1)}s`,
    animationPlayState: paused.value ? "paused" : "running",
  };
});

const genderRingClass = (genderId) => {
  if (genderId === 1) return "ring-male";
  if (genderId === 2) return "ring-female";
  return "ring-other";
};

const openProfile = (user) => {
  selectedUserId.value = user.id;
  isProfileDialogOpen.value = true;
};

const load = async () => {
  try {
    const res = await $fetch("/api/recently-connected");
    if (res?.success && Array.isArray(res.data) && res.data.length >= 4) {
      users.value = res.data;
    }
  } catch {
    // silently fail — ticker is decorative
  }
};

let interval = null;
onMounted(() => {
  load();
  interval = setInterval(load, 60_000);
});
onUnmounted(() => clearInterval(interval));
</script>

<style scoped>
.ticker-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 14px auto 0;
  max-width: min(92vw, 680px);
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 999px;
  padding: 6px 6px 6px 14px;
  overflow: hidden;
  height: 44px;
}

.ticker-label {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  padding-right: 10px;
  border-right: 1px solid rgba(255, 255, 255, 0.15);
}

.ticker-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.5);
  animation: pulse-dot 2.4s ease-in-out infinite;
  flex-shrink: 0;
}

@keyframes pulse-dot {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.5);
  }
  50% {
    box-shadow: 0 0 0 5px rgba(74, 222, 128, 0);
  }
}

.ticker-label-text {
  font-size: 0.7rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.65);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;
}

.ticker-viewport {
  flex: 1;
  overflow: hidden;
  min-width: 0;
  mask-image: linear-gradient(
    to right,
    transparent 0%,
    black 8%,
    black 92%,
    transparent 100%
  );
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0%,
    black 8%,
    black 92%,
    transparent 100%
  );
}

.ticker-track {
  display: flex;
  align-items: center;
  gap: 20px;
  width: max-content;
  animation: ticker-scroll var(--ticker-duration, 30s) linear infinite;
}

@keyframes ticker-scroll {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}

.ticker-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  cursor: pointer;
  border-radius: 999px;
  padding: 2px 6px 2px 2px;
  transition: background 0.15s ease;
}

.ticker-chip:hover {
  background: rgba(255, 255, 255, 0.1);
}

.avatar-ring {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 2px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.12);
}

.avatar-ring.ring-male {
  border-color: #60a5fa;
}

.avatar-ring.ring-female {
  border-color: #f472b6;
}

.avatar-ring.ring-other {
  border-color: #a78bfa;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-initial {
  font-size: 0.65rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1;
}

.ticker-flag {
  font-size: 0.8rem;
  line-height: 1;
}

.ticker-name {
  font-size: 0.78rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.88);
  white-space: nowrap;
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
}

</style>
