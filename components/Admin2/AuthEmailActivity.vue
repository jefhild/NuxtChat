<template>
  <section class="admin-auth-report">
    <div class="admin-auth-report__header">
      <div class="admin-auth-report__heading">
        <i class="mdi mdi-email-fast-outline admin-auth-report__icon" aria-hidden="true" />
        <div>
          <h2 class="admin-auth-report__title">Auth Email Activity</h2>
          <p class="admin-auth-report__subtitle">
            Magic-link and OTP send attempts, including blocked captcha and rate-limit events.
          </p>
        </div>
      </div>

      <div class="admin-auth-report__controls">
        <label class="admin-auth-report__field">
          <span class="admin-auth-report__sr-only">Window</span>
          <select
            v-model="authReportHours"
            class="admin-auth-report__control"
            aria-label="Auth activity time window"
          >
            <option
              v-for="option in authReportWindowOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>
        <button
          type="button"
          class="admin-auth-report__button"
          :disabled="authReportLoading"
          @click="loadAuthSendReport"
        >
          <i class="mdi mdi-refresh" aria-hidden="true" />
          Refresh
        </button>
      </div>
    </div>

    <LoadingContainer v-if="initialLoading" text="Loading auth email activity..." />

    <template v-else>
      <div
        v-if="authReportError"
        class="admin-auth-report__banner admin-auth-report__banner--error"
        role="alert"
      >
        {{ authReportError }}
      </div>

      <template v-else>
        <div class="admin-auth-report__stats">
          <article class="admin-auth-report__stat">
            <span class="admin-auth-report__stat-label">Attempts</span>
            <strong class="admin-auth-report__stat-value">{{ authSummary.total }}</strong>
            <span class="admin-auth-report__stat-meta">{{ authReportWindowLabel }}</span>
          </article>
          <article class="admin-auth-report__stat">
            <span class="admin-auth-report__stat-label">Allowed</span>
            <strong class="admin-auth-report__stat-value">{{ authSummary.allowed }}</strong>
            <span class="admin-auth-report__stat-meta">{{ authSummary.blocked }} blocked</span>
          </article>
          <article class="admin-auth-report__stat">
            <span class="admin-auth-report__stat-label">Unique emails</span>
            <strong class="admin-auth-report__stat-value">{{ authSummary.uniqueEmails }}</strong>
            <span class="admin-auth-report__stat-meta">{{ authSummary.uniqueIps }} IPs</span>
          </article>
          <article class="admin-auth-report__stat">
            <span class="admin-auth-report__stat-label">Blocked reasons</span>
            <strong class="admin-auth-report__stat-value">{{ authSummary.blockedRateLimit }}</strong>
            <span class="admin-auth-report__stat-meta">{{ authSummary.blockedCaptcha }} captcha</span>
          </article>
        </div>

        <div
          v-if="authReport?.sampleTruncated"
          class="admin-auth-report__banner admin-auth-report__banner--info"
        >
          High-volume window. Summary is based on the latest {{ authReport?.sampledRows || 0 }} attempts.
        </div>

        <div class="admin-auth-report__layout">
          <section class="admin-auth-report__panel admin-auth-report__panel--sidebar">
            <div class="admin-auth-report__panel-header">
              <h3 class="admin-auth-report__panel-title">Top blocked IPs</h3>
              <span class="admin-auth-report__panel-note">Sample window</span>
            </div>

            <div
              v-if="authReportLoading"
              class="admin-auth-report__empty"
            >
              Loading auth report...
            </div>
            <div
              v-else-if="!topBlockedIps.length"
              class="admin-auth-report__empty"
            >
              No blocked IP activity in this window.
            </div>
            <div v-else class="admin-auth-report__ip-list">
              <div
                v-for="entry in topBlockedIps"
                :key="entry.ip"
                class="admin-auth-report__ip-row"
              >
                <span class="admin-auth-report__ip-text" :title="entry.ip">{{ entry.ip }}</span>
                <span class="admin-auth-report__pill admin-auth-report__pill--danger">
                  {{ entry.count }}
                </span>
              </div>
            </div>
          </section>

          <section class="admin-auth-report__panel">
            <div class="admin-auth-report__panel-header">
              <h3 class="admin-auth-report__panel-title">Recent attempts</h3>
              <span class="admin-auth-report__panel-note">Newest first</span>
            </div>

            <div
              v-if="authReportLoading"
              class="admin-auth-report__empty"
            >
              Loading recent auth attempts...
            </div>
            <div
              v-else-if="!recentAuthAttempts.length"
              class="admin-auth-report__empty"
            >
              No auth send attempts in this window.
            </div>
            <div v-else class="admin-auth-report__table">
              <div class="admin-auth-report__table-head">
                <span>When</span>
                <span>Email</span>
                <span>IP</span>
                <span>Status</span>
              </div>
              <div
                v-for="item in recentAuthAttempts"
                :key="item.id"
                class="admin-auth-report__table-row"
              >
                <span :title="formatDateTime(item.created_at)">
                  {{ formatDateTime(item.created_at) }}
                </span>
                <span class="admin-auth-report__email" :title="item.email_normalized || '—'">
                  {{ item.email_normalized || "—" }}
                </span>
                <span class="admin-auth-report__ip" :title="item.ip_address || '—'">
                  {{ item.ip_address || "—" }}
                </span>
                <span>
                  <span
                    class="admin-auth-report__pill"
                    :class="authAttemptPillClass(item)"
                  >
                    {{ authAttemptStatusLabel(item) }}
                  </span>
                </span>
              </div>
            </div>
          </section>
        </div>
      </template>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";

const initialLoading = ref(true);
const authReportLoading = ref(false);
const authReportError = ref("");
const authReportHours = ref("24");
const authReport = ref(null);

const authReportWindowOptions = [
  { label: "Last hour", value: "1" },
  { label: "Last 24 hours", value: "24" },
  { label: "Last 7 days", value: "168" },
];

const authSummary = computed(() => ({
  total: Number(authReport.value?.summary?.total || 0),
  allowed: Number(authReport.value?.summary?.allowed || 0),
  blocked: Number(authReport.value?.summary?.blocked || 0),
  uniqueIps: Number(authReport.value?.summary?.uniqueIps || 0),
  uniqueEmails: Number(authReport.value?.summary?.uniqueEmails || 0),
  blockedCaptcha: Number(authReport.value?.summary?.blockedCaptcha || 0),
  blockedRateLimit: Number(authReport.value?.summary?.blockedRateLimit || 0),
}));

const authReportWindowLabel = computed(() => {
  const option = authReportWindowOptions.find(
    (entry) => entry.value === String(authReportHours.value)
  );
  return option?.label || "Last 24 hours";
});

const recentAuthAttempts = computed(() =>
  Array.isArray(authReport.value?.recent) ? authReport.value.recent : []
);

const topBlockedIps = computed(() =>
  Array.isArray(authReport.value?.topBlockedIps) ? authReport.value.topBlockedIps : []
);

const authAttemptStatusLabel = (item) => {
  if (!item) return "Unknown";
  if (item.decision === "allowed") {
    const mode = String(item.mode || "").toLowerCase();
    return mode === "otp" ? "Allowed OTP" : "Allowed link";
  }
  const reason = String(item.block_reason || "").toLowerCase();
  if (reason.includes("captcha")) return "Blocked captcha";
  if (reason.includes("rate_limit")) return "Blocked rate limit";
  return "Blocked";
};

const authAttemptPillClass = (item) => {
  if (item?.decision === "allowed") return "admin-auth-report__pill--success";
  const reason = String(item?.block_reason || "").toLowerCase();
  if (reason.includes("captcha")) return "admin-auth-report__pill--warning";
  return "admin-auth-report__pill--danger";
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const loadAuthSendReport = async () => {
  authReportLoading.value = true;
  authReportError.value = "";
  try {
    authReport.value = await $fetch("/api/admin/auth-send-attempts", {
      query: {
        hours: Number(authReportHours.value || 24),
        limit: 24,
      },
    });
  } catch (error) {
    console.error("[admin] loadAuthSendReport failed:", error);
    authReport.value = null;
    const message =
      error?.data?.error?.message ||
      error?.message ||
      "Failed to load auth email activity.";
    authReportError.value = message.includes("auth_send_attempts")
      ? "Auth email activity table is missing. Run SQL/20260509_add_auth_send_attempts.sql in Supabase first."
      : message;
  } finally {
    authReportLoading.value = false;
    initialLoading.value = false;
  }
};

watch(authReportHours, () => {
  loadAuthSendReport();
});

onMounted(() => {
  loadAuthSendReport();
});
</script>

<style scoped>
.admin-auth-report {
  display: grid;
  gap: 18px;
}

.admin-auth-report__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.admin-auth-report__heading {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  min-width: 0;
}

.admin-auth-report__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: rgba(59, 130, 246, 0.14);
  color: #7fb2ff;
  font-size: 1.2rem;
  flex: 0 0 auto;
}

.admin-auth-report__title {
  margin: 0;
  color: #f8fafc;
  font-size: 1.55rem;
  font-weight: 700;
  line-height: 1.15;
}

.admin-auth-report__subtitle {
  margin: 6px 0 0;
  color: rgba(226, 232, 240, 0.8);
  font-size: 0.97rem;
  line-height: 1.45;
  max-width: 720px;
}

.admin-auth-report__controls {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.admin-auth-report__field {
  display: inline-flex;
}

.admin-auth-report__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.admin-auth-report__control,
.admin-auth-report__button {
  min-height: 40px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(15, 23, 42, 0.72);
  color: #e2e8f0;
  font: inherit;
}

.admin-auth-report__control {
  min-width: 164px;
  padding: 0 14px;
}

.admin-auth-report__button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  cursor: pointer;
  font-weight: 600;
}

.admin-auth-report__button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.admin-auth-report__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.admin-auth-report__stat,
.admin-auth-report__panel {
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(19, 29, 52, 0.96), rgba(16, 24, 44, 0.94));
  box-shadow: 0 14px 34px rgba(2, 6, 23, 0.18);
}

.admin-auth-report__stat {
  display: grid;
  gap: 5px;
  padding: 14px 16px;
}

.admin-auth-report__stat-label,
.admin-auth-report__panel-note {
  color: rgba(226, 232, 240, 0.72);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.admin-auth-report__stat-value {
  color: #f8fafc;
  font-size: 1.8rem;
  font-weight: 800;
  line-height: 1;
}

.admin-auth-report__stat-meta,
.admin-auth-report__empty {
  color: rgba(226, 232, 240, 0.76);
  font-size: 0.9rem;
  line-height: 1.45;
}

.admin-auth-report__banner {
  padding: 11px 14px;
  border-radius: 14px;
  font-size: 0.94rem;
  line-height: 1.45;
}

.admin-auth-report__banner--info {
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(96, 165, 250, 0.2);
  color: #cfe0ff;
}

.admin-auth-report__banner--error {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.2);
  color: #fecaca;
}

.admin-auth-report__layout {
  display: grid;
  grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
  gap: 14px;
}

.admin-auth-report__panel {
  padding: 14px 16px 16px;
}

.admin-auth-report__panel-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.admin-auth-report__panel-title {
  margin: 0;
  color: #f8fafc;
  font-size: 1rem;
  font-weight: 700;
}

.admin-auth-report__ip-list,
.admin-auth-report__table {
  display: grid;
  gap: 8px;
}

.admin-auth-report__ip-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.46);
}

.admin-auth-report__ip-text,
.admin-auth-report__email,
.admin-auth-report__ip {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-auth-report__ip {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.87rem;
}

.admin-auth-report__table-head,
.admin-auth-report__table-row {
  display: grid;
  grid-template-columns: minmax(160px, 1.1fr) minmax(240px, 1.5fr) minmax(120px, 0.8fr) auto;
  gap: 12px;
  align-items: center;
}

.admin-auth-report__table-head {
  padding: 0 10px 4px;
  color: rgba(226, 232, 240, 0.72);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.admin-auth-report__table-row {
  padding: 10px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.46);
  color: #e5edf9;
  font-size: 0.93rem;
  line-height: 1.3;
}

.admin-auth-report__pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.admin-auth-report__pill--success {
  background: rgba(34, 197, 94, 0.16);
  color: #86efac;
}

.admin-auth-report__pill--warning {
  background: rgba(250, 204, 21, 0.16);
  color: #fde68a;
}

.admin-auth-report__pill--danger {
  background: rgba(239, 68, 68, 0.16);
  color: #fca5a5;
}

@media (max-width: 1024px) {
  .admin-auth-report__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .admin-auth-report__layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .admin-auth-report__header {
    flex-direction: column;
  }

  .admin-auth-report__controls {
    width: 100%;
    justify-content: stretch;
  }

  .admin-auth-report__field,
  .admin-auth-report__control,
  .admin-auth-report__button {
    width: 100%;
  }

  .admin-auth-report__stats {
    grid-template-columns: 1fr;
  }

  .admin-auth-report__table-head {
    display: none;
  }

  .admin-auth-report__table-row {
    grid-template-columns: 1fr;
    gap: 6px;
  }
}
</style>
