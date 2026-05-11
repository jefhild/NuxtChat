<template>
  <div class="language-practice-banner mb-2">
    <i
      class="mdi mdi-translate language-practice-banner__icon"
      aria-hidden="true"
    />
    <div class="language-practice-banner__content">
      <div class="language-practice-banner__title">{{ title }}</div>
    </div>
    <button
      type="button"
      class="language-practice-banner__action"
      @click="$emit('deactivate')"
    >
      {{ t("components.activeChats.end-language-practice-title") }}
    </button>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps({
  session: {
    type: Object,
    default: null,
  },
});

defineEmits(["deactivate"]);

const { t } = useI18n();

const languageLabel = computed(() => {
  const code = props.session?.target_language_code;
  if (!code) return "";
  return t(`match.language.languages.${code}`);
});

const title = computed(() =>
  t("components.languagePracticeBanner.title", { language: languageLabel.value })
);
</script>

<style scoped>
.language-practice-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 0.72rem 0.82rem;
  border: 1px solid rgba(114, 230, 126, 0.24);
  border-radius: 0.85rem;
  background: linear-gradient(
    180deg,
    rgba(42, 96, 58, 0.14),
    rgba(var(--color-surface), 0.92)
  );
  box-shadow: 0 10px 24px rgba(var(--color-shadow), 0.12);
}

.language-practice-banner__icon {
  color: #72e67e;
  margin-top: 2px;
  font-size: 1rem;
  line-height: 1;
}

.language-practice-banner__content {
  flex: 1 1 auto;
  min-width: 0;
}

.language-practice-banner__title {
  color: #72e67e;
  font-size: 0.92rem;
  font-weight: 600;
  line-height: 1.25;
}

.language-practice-banner__action {
  flex: 0 0 auto;
  align-self: center;
  border-radius: 0.75rem;
  border: 1px solid rgba(114, 230, 126, 0.28);
  background: rgba(42, 96, 58, 0.08);
  color: #72e67e;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.42rem 0.68rem;
}

.language-practice-banner__action:hover {
  background: rgba(114, 230, 126, 0.14);
}

@media (max-width: 640px) {
  .language-practice-banner {
    gap: 0.55rem;
    padding: 0.65rem 0.72rem;
  }

  .language-practice-banner__action {
    padding-inline: 0.6rem;
    font-size: 0.76rem;
  }
}
</style>
