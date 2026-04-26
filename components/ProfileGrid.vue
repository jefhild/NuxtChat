<template>
  <div class="profile-grid">
    <TransitionGroup name="fade" tag="div" class="profile-grid__items">
      <div
        v-for="profile in displayedProfiles"
        :key="profile.user_id"
        class="profile-grid__item"
      >
        <article
          :class="[
            'profile-grid-card',
            profile.marked_for_deletion_at ? 'marked-for-deletion' : '',
          ]"
          :style="{
            backgroundImage: `url(${
              profile.avatar_url || '/images/avatars/male_placeholder.png'
            })`,
          }"
        >
          <NuxtLink
            :to="profilePath(profile)"
            class="profile-grid-card__link"
            :aria-label="displayNameFor(profile)"
          />

          <div class="overlay profile-grid-card__content">
            <div class="profile-grid-card__summary">
              <div class="profile-grid-card__name">
                {{ displayNameFor(profile) }}
              </div>
              <div v-if="taglineFor(profile)" class="tagline profile-grid-card__tagline">
                {{ taglineFor(profile) }}
              </div>
              <div
                v-if="profile.upvote_count"
                class="profile-grid-card__upvotes"
              >
                <i
                  class="mdi mdi-thumb-up profile-grid-card__upvote-icon"
                  aria-hidden="true"
                />
                <span class="profile-grid-card__upvote-count">
                  {{ profile.upvote_count }}
                </span>
              </div>
            </div>

            <div class="profile-grid-card__actions">
              <div
                v-if="profile.marked_for_deletion_at"
                class="profile-grid-card__deletion"
              >
                <div>{{ timeLeft(refreshTime) }}</div>
                <button
                  type="button"
                  class="profile-grid-card__action-btn profile-grid-card__action-btn--success"
                  @click.stop.prevent="unmarkDeletion(profile)"
                >
                  Undo Deletion
                </button>
              </div>

              <button
                v-else-if="allowDelete"
                type="button"
                class="profile-grid-card__action-btn profile-grid-card__action-btn--danger"
                @click.stop.prevent="openDeleteDialog(profile)"
              >
                Delete
              </button>
            </div>
          </div>
        </article>
      </div>
    </TransitionGroup>

    <div
      v-if="props.limit && loadedCount < props.profiles.length"
      ref="infiniteScrollTrigger"
      class="profile-grid__sentinel"
      aria-hidden="true"
    />

    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="confirmDeleteDialog"
          class="profile-grid-dialog"
          role="presentation"
        >
          <button
            type="button"
            class="profile-grid-dialog__scrim"
            aria-label="Close delete confirmation"
            @click="confirmDeleteDialog = false"
          />
          <div
            class="profile-grid-dialog__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-grid-delete-title"
          >
            <h2 id="profile-grid-delete-title" class="profile-grid-dialog__title">
              Confirm Deletion
            </h2>
            <p class="profile-grid-dialog__body">
              Are you sure you want to delete this user?
            </p>
            <div class="profile-grid-dialog__actions">
              <button
                type="button"
                class="profile-grid-dialog__btn profile-grid-dialog__btn--secondary"
                @click="confirmDeleteDialog = false"
              >
                Cancel
              </button>
              <button
                type="button"
                class="profile-grid-dialog__btn profile-grid-dialog__btn--danger"
                @click="confirmDelete"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import { resolveProfileLocalization } from "@/composables/useProfileLocalization";

const localPath = useLocalePath();
const { locale } = useI18n();
const props = defineProps({
  profiles: {
    type: Array,
    required: true,
  },
  delete: {
    type: Boolean,
    default: false,
  },
  limit: {
    type: Number,
    default: null,
  },
});

const emit = defineEmits(["user-deleted"]);

const { markUserForDeletion, unmarkUserForDeletion } = useDb();

const loadedCount = ref(props.limit || 12);
const batchSize = 12;
const displayedProfiles = computed(() =>
  props.limit ? props.profiles.slice(0, loadedCount.value) : props.profiles
);

const displayNameFor = (profile) =>
  resolveProfileLocalization({
    profile,
    readerLocale: locale?.value,
  }).displayname || profile?.displayname || "";

const taglineFor = (profile) =>
  resolveProfileLocalization({
    profile,
    readerLocale: locale?.value,
  }).tagline || profile?.tagline || "";

const profilePath = (profile) =>
  localPath(`/profiles/${profile.gender?.toLowerCase()}/${profile.slug}`);

const infiniteScrollTrigger = ref(null);
const allowDelete = ref(props.delete);
const confirmDeleteDialog = ref(false);
const userToDelete = ref(null);
const refreshTime = ref(Date.now());
let refreshTimer = null;
let observer = null;

function loadMoreProfiles() {
  if (loadedCount.value < props.profiles.length) {
    loadedCount.value = Math.min(
      loadedCount.value + batchSize,
      props.profiles.length
    );
  }
}

function timeLeft(refreshTrigger) {
  const now = new Date(refreshTrigger);
  const midnight = new Date(now);
  midnight.setHours(23, 59, 59, 999);

  const diff = midnight.getTime() - now.getTime();
  if (diff <= 0) return "Deleting soon...";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`;
}

function openDeleteDialog(profile) {
  userToDelete.value = profile;
  confirmDeleteDialog.value = true;
}

async function confirmDelete() {
  if (!userToDelete.value) return;

  await markUserForDeletion(userToDelete.value.user_id);
  emit("user-deleted", userToDelete.value.user_id);
  confirmDeleteDialog.value = false;
}

async function unmarkDeletion(profile) {
  try {
    await unmarkUserForDeletion(profile.user_id);
    profile.marked_for_deletion_at = null;
  } catch (err) {
    console.error("Error unmarking user:", err);
  }
}

onMounted(() => {
  refreshTimer = window.setInterval(() => {
    refreshTime.value = Date.now();
  }, 60000);

  if (!props.limit || !infiniteScrollTrigger.value) return;

  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) {
        loadMoreProfiles();
      }
    },
    { rootMargin: "100px" }
  );

  observer.observe(infiniteScrollTrigger.value);
});

onBeforeUnmount(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
  observer?.disconnect();
});
</script>

<style scoped>
.profile-grid__items {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.5rem;
  justify-items: center;
}

.profile-grid__item {
  width: 100%;
  display: flex;
  justify-content: center;
}

.profile-grid-card {
  width: 180px;
  max-width: 100%;
  height: 220px;
  position: relative;
  overflow: hidden;
  border-radius: 15px;
  background-size: cover;
  background-position: center;
  transition: transform 0.2s ease;
  box-shadow: 0 10px 28px rgb(var(--color-shadow) / 0.18);
}

.profile-grid-card:hover {
  transform: scale(1.03);
}

.profile-grid-card::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  background: rgba(0, 0, 0, 0.15);
}

.profile-grid-card__link {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.profile-grid-card__content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  height: 100%;
  padding: 0.75rem;
  text-align: center;
}

.profile-grid-card__summary {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.profile-grid-card__name {
  max-width: 100%;
  color: #fff;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.profile-grid-card__tagline {
  margin-top: 0.25rem;
}

.profile-grid-card__upvotes {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  margin-top: 0.25rem;
  color: #fff;
}

.profile-grid-card__upvote-icon {
  color: #facc15;
  font-size: 1rem;
}

.profile-grid-card__upvote-count {
  font-size: 0.75rem;
}

.profile-grid-card__actions {
  display: flex;
  justify-content: center;
  margin-top: 0.75rem;
}

.profile-grid-card__deletion {
  color: #fff;
}

.profile-grid-card__action-btn {
  position: relative;
  z-index: 3;
  min-height: 28px;
  padding: 0 10px;
  border: 0;
  border-radius: 999px;
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 0.72rem;
  font-weight: 700;
}

.profile-grid-card__action-btn--success {
  margin-top: 0.4rem;
  background: #16a34a;
}

.profile-grid-card__action-btn--danger {
  background: #dc2626;
}

.profile-grid__sentinel {
  height: 1px;
}

.tagline {
  max-width: 160px;
  color: #fff;
  font-size: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.marked-for-deletion {
  border: 2px solid red;
  box-shadow: 0 0 10px rgba(255, 0, 0, 0.7);
}

.profile-grid-dialog {
  position: fixed;
  inset: 0;
  z-index: 2600;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.profile-grid-dialog__scrim {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgb(15 23 42 / 0.56);
}

.profile-grid-dialog__panel {
  position: relative;
  z-index: 1;
  width: min(400px, 94vw);
  border-radius: 18px;
  border: 1px solid rgb(var(--color-border) / 0.75);
  background: rgb(var(--color-surface));
  color: rgb(var(--color-foreground));
  box-shadow: 0 24px 60px rgb(var(--color-shadow) / 0.26);
  padding: 20px;
}

.profile-grid-dialog__title {
  margin: 0 0 10px;
  font-size: 1.15rem;
  font-weight: 700;
}

.profile-grid-dialog__body {
  margin: 0;
  color: rgb(var(--color-foreground) / 0.8);
}

.profile-grid-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}

.profile-grid-dialog__btn {
  min-height: 40px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid transparent;
  cursor: pointer;
  font: inherit;
  font-weight: 600;
}

.profile-grid-dialog__btn--secondary {
  background: rgb(var(--color-foreground) / 0.06);
  color: rgb(var(--color-foreground));
}

.profile-grid-dialog__btn--danger {
  background: #dc2626;
  color: #fff;
}

@media (min-width: 960px) {
  .profile-grid__items {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1280px) {
  .profile-grid__items {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .profile-grid__items {
    gap: 1rem;
  }

  .profile-grid-card {
    width: 150px;
    height: 200px;
  }

  .profile-grid-dialog__actions {
    flex-direction: column;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
