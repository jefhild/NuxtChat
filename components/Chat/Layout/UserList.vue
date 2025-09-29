<template>
  <div ref="wrapRef" class="users-vs-wrapper">
    <v-virtual-scroll
      class="users-vs"
      :items="users"
      :height="listHeight"
      :item-height="itemHeight"
    >
      <template #default="{ item: u }">
        <div
          :class="['row', { selected: isSelected(u) }]"
          @click="$emit('user-selected', u)"
        >

          <span class="avatar-wrap">
            <v-avatar size="36">
              <v-img v-if="u.avatar_url" :src="u.avatar_url" cover />
              <span v-else class="avatar-fallback">{{
                (u.displayname || "?").slice(0, 1).toUpperCase()
              }}</span>
            </v-avatar>

            <span class="presence-dot" :class="u.online ? 'on' : 'off'"></span>

            <span v-if="unreadFor(u) > 0" class="unread-badge">
              <span class="unread-dot"></span>
              <span class="unread-count">{{ unreadFor(u) }}</span>
            </span>
          </span>

          <span class="name">
            <div class="displayname">{{ u.displayname || "(no name)" }}</div>
            <div class="tagline muted">
              • {{ (u.tagline || u.tagline)?.slice(0, 35) }}
            </div>
          </span>

          <!-- <span class="name">
      <div class="displayname">{{ u.displayname || "(no name)" }}</div>
      <div class="userid muted">ID: {{ (u.user_id || u.id)?.slice(0, 8) }}</div>
    </span> -->

          <!-- <span class="state">{{ u.online ? 'online' : 'offline' }}</span> -->
           <span class="flag">{{ u.country_emoji}}</span>
        </div>
      </template>
    </v-virtual-scroll>
  </div>
</template>


<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";

const props = defineProps({
  users: { type: Array, default: () => [] },
  selectedUserId: { type: String, default: null },
  // optional: set from parent. if not provided we auto-measure.
  height: { type: Number, default: null },
  unreadByPeer: { type: Object, default: () => ({}) },
});
defineEmits(["user-selected"]);

const idStr = (u) => String(u?.user_id ?? u?.id ?? "");
const isSelected = (u) =>
  props.selectedUserId && idStr(u) === String(props.selectedUserId);

const unreadFor = (u) => props.unreadByPeer[idStr(u)] || 0;

// Virtual scroll sizing
const itemHeight = 48; // tweak to match your row CSS (padding + line-height)
const wrapRef = ref(null);
const innerHeight = ref(320);

let ro = null;
function measure() {
  const h = wrapRef.value?.clientHeight || 0;
  innerHeight.value = Math.max(200, Math.round(h));
}
onMounted(() => {
  measure();
  if (!props.height && wrapRef.value) {
    ro = new ResizeObserver(measure);
    ro.observe(wrapRef.value);
    window.addEventListener("resize", measure);
  }
});
onBeforeUnmount(() => {
  if (ro) ro.disconnect();
  window.removeEventListener("resize", measure);
});

const listHeight = computed(() => props.height ?? innerHeight.value);
</script>

<style scoped>
.users-vs-wrapper {
  /* allow parent column to control height; this fills available space */
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0; /* important so child can shrink and scroll inside flex container */
}
.users-vs {
  flex: 1 1 auto;
}

.avatar-wrap {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 9999px;
  overflow: visible; /* important: let the badge bleed outside */
  flex: 0 0 auto;
}

/* make sure the avatar sits in a lower layer */
.avatar-wrap :is(.v-avatar, .v-avatar .v-img, img) {
  position: relative;
  z-index: 0;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.avatar-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: #e0e0e0;
  color: #555;
  font-weight: 600;
}

.presence-dot {
  position: absolute;
  right: 2px;
  bottom: 3px;
  width: 10px;
  height: 10px;
  border-radius: 9999px;
  box-shadow: 0 0 0 2px #fff; /* ring for contrast */
}
.presence-dot.on {
  background: #20c997;
} /* green */
.presence-dot.off {
  background: #bdbdbd;
}

/* badge above the avatar */
.unread-badge {
  position: absolute;
  top: -4px;
  right: -10px;
  z-index: 10; /* bring to front */
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 6px;
  height: 16px;
  border-radius: 9999px;
  background: #ff3b30;
  color: #fff;
  font-size: 10px;
  line-height: 1;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
}

.unread-dot {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: #fff;
  opacity: 0.9;
}

.unread-count {
  font-variant-numeric: tabular-nums;
}

/* Your original row styles adapted for divs */
.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  cursor: pointer;
}
.row:hover {
  background: rgba(227, 242, 253, 0.4);
}
/* .selected { background: rgba(0,120,255,.08); } */
.row.selected {
  background: rgba(227, 242, 253, 0.9);
  border-left: 3px solid #0078ff;
}

.name {
  flex: 1;
  display: flex;
  flex-direction: column;
  line-height: 1.2; /* tighter line spacing */
}

.displayname {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.2;
}

.tagline {
  margin-top: 2px; /* shrink gap between lines */
  font-size: 12px; /* smaller tagline text */
  line-height: 1.2;
}

.muted {
  color: #777;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.15) inset;
}
.dot.on {
  background: #20c997;
} /* green */
.dot.off {
  background: #ccc;
}
.state {
  font-size: 12px;
  color: #555;
}
.flag {
  font-size: 18px;
}
</style>
