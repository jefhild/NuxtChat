<template>
  <div class="relative">
    <select
      v-model="currentLocale"
      @change="switchLanguage"
      class="language-select"
      :style="{ backgroundImage: `url('${selectedFlag}')` }"
    >
      <option
        v-for="locale in localesWithFlags"
        :key="locale.code"
        :value="locale.code"
      >
        {{ locale.code }}
      </option>
    </select>
  </div>
</template>

<script setup>
import { useI18n } from "vue-i18n";
const { locale, availableLocales: rawLocales, setLocale } = useI18n();

const currentLocale = ref(locale.value);

// Static flag paths
const flagPaths = {
  en: "/images/flags/icon_us.png",
  fr: "/images/flags/icon_fr.png",
};

const localesWithFlags = rawLocales.map((code) => ({
  code,
  flag: flagPaths[code] || "/images/flags/default.png",
}));

const selectedFlag = computed(() => {
  const match = localesWithFlags.find((l) => l.code === currentLocale.value);
  return match?.flag || "";
});

const switchLanguage = () => {
  setLocale(currentLocale.value);
};
</script>

<style scoped>
.language-select {
  width: 32px;
  height: 48px;
  cursor: pointer;
  border: none;
  background-color: transparent;
  background-repeat: no-repeat;
  background-position: center;
  background-size: 24px 18px;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  color: transparent;
  text-shadow: 0 0 0 transparent;

  /* 👇 Remove border and focus styles */
  outline: none;
  box-shadow: none;
}

.language-select:focus {
  outline: none;
  box-shadow: none;
  border: none;
}
</style>
