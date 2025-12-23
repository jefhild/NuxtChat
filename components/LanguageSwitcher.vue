<template>
  <div class="language-switcher">
    <!-- <select v-model="currentLocale" @change="switchLanguage" :style="{ backgroundImage: `url('${selectedFlag}')` }"> -->
          <select
            v-model="currentLocale"
            :style="{ backgroundImage: `url('${selectedFlag}')` }"
            aria-label="Language selector"
          >
      <option v-for="locale in localesWithFlags" :key="locale.code" :value="locale.code">
        {{ locale.label }}
      </option>
    </select>
  </div>
</template>

<script setup>
import { useI18n } from "vue-i18n";
const { locale, availableLocales: rawLocales, setLocale } = useI18n();

const normalizeLocale = (code = "") => code.toLowerCase().split("-")[0];
const resolveLocale = (code = "") => {
  if (rawLocales.includes(code)) return code;
  const normalized = normalizeLocale(code);
  return rawLocales.includes(normalized) ? normalized : "en";
};

const currentLocale = ref(resolveLocale(locale.value));

const flagPaths = {
  en: "/images/flags/icon_us.png",
  fr: "/images/flags/icon_fr.png",
  zh: "/images/flags/icon_zh.png",
  ru: "/images/flags/icon_ru.png",
};

const selectedFlag = computed(() => {
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

// Keep the select in sync with the resolved locale.
watch(locale, (val) => {
  const resolved = resolveLocale(val);
  if (currentLocale.value !== resolved) {
    currentLocale.value = resolved;
  }
});

// Watch the model and call setLocale with the STRING code (not the Event).
watch(currentLocale, async (val, old) => {
  const resolved = resolveLocale(val);
  if (resolved !== val) {
    currentLocale.value = resolved;
    return;
  }
  if (!val || val === old) return;
  try {
    await setLocale(val); // This navigates to the localized route
  } catch (e) {
    console.warn("[i18n] setLocale failed:", e);
  }
});

</script>

<style scoped>
.language-switcher {
  display: inline-block;
  position: relative;
}

select {
  appearance: none;
  padding: 6px 8px 6px 32px;
  font-size: 11px;
  border-radius: 6px;
  background-repeat: no-repeat;
  background-position: 8px calc(50% - 2px);
  background-size: 20px 15px;
  width: 44px;
  color: transparent;
  text-shadow: none;
  height: 28px;
  line-height: 1.1;
  vertical-align: middle;
}

option {
  color: #111;
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
