<template>
  <div class="language-switcher">
    <select v-model="currentLocale" @change="switchLanguage" :style="{ backgroundImage: `url('${selectedFlag}')` }">
      <option v-for="locale in localesWithFlags" :key="locale.code" :value="locale.code">
        {{ locale.label }}
      </option>
    </select>
  </div>
</template>

<script setup>
import { useI18n } from "vue-i18n";
const { locale, availableLocales: rawLocales, setLocale } = useI18n();

const currentLocale = ref(locale.value);

const flagPaths = {
  en: "/images/flags/icon_us.png",
  fr: "/images/flags/icon_fr.png",
  zh: "/images/flags/icon_zh.png",
  ru: "/images/flags/icon_ru.png",
};

const selectedFlag = computed(() =>
{
  const match = localesWithFlags.find((l) => l.code === currentLocale.value);
  return match?.flag || "/images/flags/default.png";
});

const localeLabels = {
  en: "English",
  fr: "Français",
  zh: "中文",
  ru: "Русский",
};

const localesWithFlags = rawLocales.map((code) => ({
  code,
  label: `${localeLabels[code] || code}`,
  flag: flagPaths[code] || "/images/flags/default.png",
}));

const switchLanguage = () => {
  setLocale(currentLocale.value);
};
</script>

<style scoped>
.language-switcher {
  display: inline-block;
  position: relative;
}

select {
  appearance: none;
  padding: 6px 12px 6px 36px;
  font-size: 11px;
  border-radius: 6px;
  background-repeat: no-repeat;
  background-position: 8px center;
  background-size: 20px 15px;
}

select:focus {
  outline: none;
  border-color: #66afe9;
}

/* Dynamically update flag based on selected option */
.language-switcher select {
  background-image: url("/images/flags/icon_us.png"); /* fallback default */
}
</style>
