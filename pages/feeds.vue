<template>
  <v-container fluid class="feeds-shell">
    <div class="feeds-header-shell">
      <div class="feeds-header-actions">
        <PageHeader
          :text="$t('pages.feeds.heading')"
          :subtitle="$t('pages.feeds.subtitle')"
        />
      </div>
    </div>

    <div class="feeds-list">
      <v-skeleton-loader
        v-if="loading"
        type="list-item@4"
        class="mt-4"
      />
      <div v-else-if="!threads.length" class="text-body-2 mt-4">
        {{ $t("pages.feeds.empty") }}
      </div>
      <div v-else>
        <MoodFeedPromptCard
          v-for="thread in threads"
          :key="thread.promptKey || thread.id || thread.promptText"
          :thread="thread"
          :me-id="auth.user?.id || null"
          :can-reply="canPost"
          :loading="loading"
          @send-reply="submitReply"
          @vote="handleVote"
          @delete-entry="deleteEntry"
          @delete-reply="deleteReply"
          @flag="flagItem"
          @login-request="showLoginNotice"
          @profile="openProfile"
        />
      </div>
    </div>

    <ProfileDialog
      v-model="profileOpen"
      :user-id="profileUserId"
    />

    <v-snackbar v-model="loginNoticeOpen" timeout="3000">
      {{ loginNoticeText }}
      <template #actions>
        <v-btn variant="text" @click="redirectToLogin">
          {{ loginNoticeAction }}
        </v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/authStore1";
import MoodFeedPromptCard from "@/components/MoodFeed/PromptCard.vue";
import PageHeader from "@/components/PageHeader.vue";
import ProfileDialog from "@/components/ProfileDialog.vue";

const { locale, t } = useI18n();
const auth = useAuthStore();
const localPath = useLocalePath();

useSeoI18nMeta("feeds");

const threads = ref([]);
const loading = ref(true);
const canPost = computed(() => auth.authStatus === "authenticated");
const profileOpen = ref(false);
const profileUserId = ref(null);
const loginNoticeOpen = ref(false);
const loginNoticeText = computed(() =>
  auth.authStatus === "anon_authenticated"
    ? t("pages.feeds.linkEmailNotice")
    : t("pages.feeds.signinNotice")
);
const loginNoticeAction = computed(() =>
  auth.authStatus === "anon_authenticated"
    ? t("components.profile-email-link.cta")
    : t("components.navbar.signin")
);

async function loadEntries() {
  loading.value = true;
  try {
    const res = await $fetch("/api/mood-feed/entries", {
      query: { locale: locale.value, limit: 30, offset: 0 },
    });
    threads.value = res?.items || [];
  } catch (err) {
    threads.value = [];
  } finally {
    loading.value = false;
  }
}


function handleVote({ id, score, myVote }) {
  if (!id) return;
  threads.value = threads.value.map((thread) => {
    const entries = (thread.entries || []).map((entry) => {
      if (entry.id === id) {
        return { ...entry, score, userVote: myVote };
      }
      const replies = (entry.replies || []).map((reply) =>
        reply.id === id ? { ...reply, score, userVote: myVote } : reply
      );
      return { ...entry, replies };
    });
    return { ...thread, entries };
  });
}

async function submitReply({ entryId, text, replyToId }) {
  if (!text?.trim()) return;
  const resolvedReplyToId = replyToId === entryId ? null : replyToId || null;
  try {
    const res = await $fetch("/api/mood-feed/replies", {
      method: "POST",
      body: {
        entryId,
        replyToId: resolvedReplyToId,
        content: text.trim(),
        locale: locale.value,
      },
    });
    const replyId = res?.replyId || `reply-${Date.now()}`;
    const profile = auth.userProfile || null;
    threads.value = threads.value.map((thread) => {
      const entries = (thread.entries || []).map((entry) => {
        if (entry.id !== entryId) return entry;
        const nextReply = {
          id: replyId,
          entryId,
          replyToId: resolvedReplyToId,
          userId: auth.user?.id || null,
          createdAt: new Date().toISOString(),
          displayText: text.trim(),
          displayLocale: locale.value,
          sourceLocale: locale.value,
          profile,
          score: 0,
          upvotes: 0,
          downvotes: 0,
          userVote: 0,
        };
        const replies = [...(entry.replies || []), nextReply];
        return {
          ...entry,
          replies,
          replyCount: (entry.replyCount || 0) + 1,
        };
      });
      return { ...thread, entries };
    });
  } catch {
  } finally {
  }
}

function redirectToLogin() {
  if (auth.authStatus === "anon_authenticated") {
    navigateTo({ path: localPath("/settings"), query: { linkEmail: "1" } });
    return;
  }
  navigateTo({
    path: localPath("/signin"),
    query: { redirect: "/feeds" },
  });
}

function showLoginNotice() {
  loginNoticeOpen.value = true;
}

function openProfile(userId) {
  if (!userId) return;
  profileUserId.value = String(userId);
  profileOpen.value = true;
}

async function flagItem({ targetType, targetId }) {
  if (!targetType || !targetId) return;
  try {
    await $fetch("/api/mood-feed/flags", {
      method: "POST",
      body: { targetType, targetId },
    });
  } catch {
  }
}

async function deleteEntry({ entryId }) {
  if (!entryId) return;
  try {
    await $fetch(`/api/mood-feed/entries/${entryId}`, { method: "DELETE" });
    threads.value = threads.value
      .map((thread) => {
        const entries = (thread.entries || []).filter(
          (entry) => entry.id !== entryId
        );
        return { ...thread, entries };
      })
      .filter((thread) => (thread.entries || []).length);
  } catch {
  }
}

async function deleteReply({ entryId, replyId }) {
  if (!entryId || !replyId) return;
  try {
    await $fetch(`/api/mood-feed/replies/${replyId}`, { method: "DELETE" });
    threads.value = threads.value.map((thread) => {
      const entries = (thread.entries || []).map((entry) => {
        if (entry.id !== entryId) return entry;
        const replies = (entry.replies || []).filter((r) => r.id !== replyId);
        return {
          ...entry,
          replies,
          replyCount: Math.max(0, (entry.replyCount || 0) - 1),
        };
      });
      return { ...thread, entries };
    });
  } catch {
  }
}

onMounted(loadEntries);
watch(locale, loadEntries);
</script>

<style scoped>
.feeds-shell {
  min-height: 100vh;
}
.feeds-header-shell {
  margin-bottom: 12px;
}
.feeds-list {
  margin-top: 18px;
}
</style>
