<template>
  <div class="language-practice-banner mb-2">
    <v-icon
      icon="mdi-translate"
      size="18"
      class="language-practice-banner__icon"
    />
    <div class="language-practice-banner__content">
      <div class="language-practice-banner__title">{{ title }}</div>
      <div class="language-practice-banner__meta">
        {{ metaLine }}
      </div>
    </div>
    <v-btn
      class="language-practice-banner__action"
      size="small"
      variant="text"
      color="success"
      @click="$emit('deactivate')"
    >
      {{ t("components.activeChats.end-language-practice-title") }}
    </v-btn>
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

const levelLabel = computed(() => {
  const level = props.session?.target_language_level || "unsure";
  return t(`pages.languagePractice.levels.${level}`);
});

const correctionLabel = computed(() => {
  const preference =
    props.session?.correction_preference || "light_corrections";
  return t(`match.language.correctionPreferences.${preference}`);
});

const modeLabel = computed(() => {
  const mode = props.session?.language_exchange_mode || "practice_only";
  return t(`pages.languagePractice.exchangeModes.${mode}`);
});

const metaLine = computed(() =>
  [
    `${t("components.languagePracticeBanner.level")}: ${levelLabel.value}`,
    `${t("components.languagePracticeBanner.corrections")}: ${correctionLabel.value}`,
    `${t("components.languagePracticeBanner.mode")}: ${modeLabel.value}`,
  ].join(" • ")
);
</script>

<style scoped>
.language-practice-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid rgba(114, 230, 126, 0.24);
  border-radius: 12px;
  background: rgba(42, 96, 58, 0.12);
}

.language-practice-banner__icon {
  color: #72e67e;
  margin-top: 2px;
}

.language-practice-banner__content {
  flex: 1 1 auto;
  min-width: 0;
}

.language-practice-banner__title {
  color: #72e67e;
  font-size: 0.98rem;
  font-weight: 600;
  line-height: 1.25;
}

.language-practice-banner__meta {
  margin-top: 2px;
  color: rgba(226, 232, 240, 0.88);
  font-size: 0.9rem;
  line-height: 1.35;
}

.language-practice-banner__action {
  flex: 0 0 auto;
  align-self: center;
  border-radius: 8px;
}
</style>
