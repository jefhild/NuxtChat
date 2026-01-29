<template>
  <!-- OUTER SHELL -->
  <v-container fluid class="d-flex flex-column min-h-0 h-100">
    <!-- Top controls row (left: filters, right: toggles) -->
    <v-row no-gutters class="min-h-0" style="flex: 0 0 auto;">
      <v-col>
        <!-- Replace with your ChatArticlesHeader/Filters if you add them later -->
        <div class="ml-2 text-subtitle-2 font-weight-medium">Articles</div>
      </v-col>

      <v-col class="d-flex justify-end">
        <!-- Example toggle slot parity (wire up when needed) -->
        <!-- <ChatArticlesToggleAi v-model="showAI" :disabled="shouldDisableToggle" /> -->
      </v-col>
    </v-row>

    <!-- BODY -->
    <v-row class="flex-grow-1 overflow-hidden min-h-0">
      <!-- LEFT: Topics -->

      <v-col
        cols="12"
        md="3"
        class="pa-2 d-flex flex-column overflow-hidden min-h-0"
      >
        <template v-if="smAndDown">
          <v-expansion-panels
            v-model="openPanels"
            multiple
            class="flex-grow-1 overflow-hidden min-h-0"
          >
            <v-expansion-panel>
              <v-expansion-panel-title
                hide-actions
                class="bg-blue-lighten-5 py-1 px-2 d-flex justify-center position-relative"
              >
                <div class="text-subtitle-2">Discussions</div>
                <v-btn
                  size="small"
                  icon
                  variant="text"
                  class="header-chevron"
                  :aria-label="openPanels.includes(0) ? 'Collapse' : 'Expand'"
                  :aria-expanded="String(openPanels.includes(0))"
                  @click.stop="togglePanel0"
                >
                  <v-icon
                    :icon="
                      openPanels.includes(0)
                        ? 'mdi-chevron-up'
                        : 'mdi-chevron-down'
                    "
                  />
                </v-btn>
              </v-expansion-panel-title>

              <v-expansion-panel-text
                class="pa-0 d-flex flex-column min-h-0"
                style="flex: 1 1 auto"
              >
                <div
                  ref="leftMobileScrollRef"
                  class="flex-grow-1 overflow-auto min-h-0 users-scroll"
                >
                  <ChatArticlesLayoutTopics
                    :topics="props.topics"
                    :pending="props.pending"
                    :formatDateTime="props.formatDateTime"
                    @open-thread="(id) => emit('open-thread', id)"
                  />
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </template>

        <template v-else>
          <div
            ref="leftDesktopScrollRef"
            class="flex-grow-1 overflow-auto min-h-0 users-scroll"
          >
            <ChatArticlesLayoutTopics
              :topics="props.topics"
              :pending="props.pending"
              :formatDateTime="props.formatDateTime"
              @open-thread="(id) => emit('open-thread', id)"
            />
          </div>
        </template>
      </v-col>

      <!-- CENTER: Empty state (until a thread route is open) -->
      <v-col
        cols="12"
        :md="activePanelOpen ? 6 : 9"
        class="pa-2 d-flex flex-column overflow-hidden min-h-0 relative"
      >
        <div v-if="!smAndDown" class="active-panel-rail">
          <v-tooltip text="Participants" location="left">
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                icon
                variant="text"
                size="x-small"
                class="active-panel-toggle"
                :aria-expanded="String(activePanelOpen)"
                aria-controls="active-panel"
                aria-label="Toggle participants panel"
                @click="activePanelOpen = !activePanelOpen"
              >
                <v-icon
                  :icon="
                    activePanelOpen ? 'mdi-chevron-right' : 'mdi-chevron-left'
                  "
                />
              </v-btn>
            </template>
          </v-tooltip>
        </div>
        <div
          ref="centerScrollRef"
          class="flex-grow-1 overflow-auto min-h-0 d-flex"
        >
          <v-card
            flat
            class="d-flex flex-column fill-height justify-center align-center w-100"
          >
            <div class="text-body-2 text-medium-emphasis">
              Select an article to view the thread.
            </div>
          </v-card>
        </div>
      </v-col>

      <!-- RIGHT: Participants (hidden on small to avoid SSR mismatch) -->
      <v-col
        v-if="activePanelOpen"
        cols="12"
        md="3"
        class="pa-2 d-none d-md-flex flex-column overflow-hidden min-h-0"
      >
        <v-card
          id="active-panel"
          flat
          class="d-flex flex-column flex-grow-1 min-h-0 active-panel-card"
        >
          <div ref="rightScrollRef" class="flex-grow-1 overflow-auto min-h-0">
            <ChatArticlesLayoutParticipants
              :participants="props.participants"
              :pending="props.participantsPending"
              :formatDateTime="props.formatDateTime"
              @open-profile="() => {}"
            />
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- FOOTER ROW (parity with ChatLayout) -->
    <v-row>
      <v-col
        cols="12"
        md="3"
        class="pa-2 d-flex flex-column overflow-hidden min-h-0"
      >
        <v-card
          v-if="!smAndDown"
          class="d-flex flex-column fill-height min-h-0"
          color="grey-lighten-4"
          rounded="lg"
          flat
        >
          <div class="ml-2 text-subtitle-2 font-weight-medium">
            {{ headerText.line1 }}
          </div>
          <div class="ml-2 text-body-2 text-medium-emphasis">
            {{ headerText.line2 }}
          </div>
        </v-card>
      </v-col>

      <v-col
        cols="12"
        md="9"
        class="pa-2 d-flex flex-column overflow-hidden min-h-0 chat-col"
      >
        <!-- Reserve space for a composer if you need it on index -->
        <!-- <ChatArticlesMessageComposer ... /> -->
      </v-col>
    </v-row>
  </v-container>

  <!-- Profile modal (kept for parity; optional wiring) -->
  <v-dialog v-model="isProfileDialogOpen" max-width="640">
    <v-card>
      <v-card-title class="d-flex justify-space-between">
        <span>{{ modalUserLocalized.displayname }}, {{ modalUser?.age }}</span>
        <v-btn
          icon="mdi-close"
          variant="text"
          @click="isProfileDialogOpen = false"
        />
      </v-card-title>

      <v-card-text>
        <div class="d-flex">
          <v-avatar
            size="80"
            :image="getAvatar(modalUser?.avatar_url)"
            class="mr-4"
          />
          <div>
            <div class="text-subtitle-1 mb-1">{{ modalUserLocalized.tagline }}</div>
            <div class="text-body-2">{{ modalUserLocalized.bio }}</div>
            <div class="text-caption mt-2">
              {{ modalUser?.country }} {{ modalUser?.country_emoji }}
              <span v-if="modalUser?.city">• {{ modalUser?.city }}</span>
            </div>
          </div>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <NuxtLink :to="profileLink" class="text-decoration-none">
          <v-btn variant="outlined" size="small">View full profile</v-btn>
        </NuxtLink>
        <v-btn color="primary">Message</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
// LAYOUT: Articles scaffold (topics | center | participants)
import { useDisplay } from "vuetify";
import { useI18n } from "vue-i18n";
import { resolveProfileLocalization } from "@/composables/useProfileLocalization";


const props = defineProps({
  user: { type: Object, default: null },
  userProfile: { type: Object, default: null },
  authStatus: { type: String, default: "unauthenticated" },
  topics: { type: Array, default: () => [] },
  pending: { type: Boolean, default: false },
  formatDateTime: { type: Function, required: true }, // injected from page for SSR safety
  participants: { type: Array, default: () => [] },
  participantsPending: { type: Boolean, default: false },
});

const emit = defineEmits(["open-thread"]);

const { smAndDown } = useDisplay();
const { locale } = useI18n();

// Local UI state (matches your ChatLayout patterns)
const openPanels = ref([0]);
const togglePanel0 = () => {
  openPanels.value = openPanels.value.includes(0)
    ? openPanels.value.filter((i) => i !== 0)
    : [...openPanels.value, 0];
};

// Optional header copy (parity with ChatLayout footer card)
const headerText = {
  line1: "Articles",
  line2: "Select an article to view the thread.",
};

const activePanelOpen = useState(
  "articlesParticipantsPanelOpen",
  () => false
);

// Modal (kept for parity with ChatLayout; can be wired later)
const isProfileDialogOpen = ref(false);
const modalUser = ref(null);
const modalUserLocalized = computed(() =>
  resolveProfileLocalization({
    profile: modalUser.value,
    readerLocale: locale?.value,
  })
);

// Helpers (no-ops/placeholder adaptations)
const profileLink = "/profile";
const getAvatar = (url) => url || "";
</script>

<style scoped>
.users-scroll {
  height: 100%;
}
.messages-sticky-header {
  position: sticky;
  top: 0;
  z-index: 2;
}
.relative {
  position: relative;
}
.header-chevron {
  position: absolute;
  right: 6px;
  top: 2px;
}
.active-panel-rail {
  --active-rail-width: 42px;
  position: absolute;
  top: 12px;
  bottom: 12px;
  right: 8px;
  width: var(--active-rail-width);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
  pointer-events: none;
  background: rgba(var(--v-theme-surface), 0.92);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 999px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
}
.active-panel-toggle {
  background: transparent;
  border: 0;
  box-shadow: none;
  width: 32px;
  height: 32px;
  pointer-events: auto;
}
.active-panel-toggle :deep(.v-icon) {
  color: rgba(var(--v-theme-on-surface), 0.8);
}
.active-panel-card {
  transition: opacity 0.2s ease, transform 0.25s ease;
}
</style>
