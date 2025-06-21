<template>
  <div class="language-dropdown" @click.outside="open = false">
    <button class="dropdown-toggle" @click="open = !open">
      <img :src="selectedFlag" alt="Selected Language" class="flag" />
    </button>
    <ul v-if="open" class="dropdown-menu">
      <li v-for="locale in localesWithFlags" :key="locale.code" @click="selectLanguage(locale.code)">
        <img :src="locale.flag" :alt="locale.label" class="flag" />
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { locale, availableLocales: rawLocales, setLocale } = useI18n();

const open = ref(false);
const currentLocale = ref(locale.value);

const flagPaths = {
  en: '/images/flags/icon_us.png',
  fr: '/images/flags/icon_fr.png',
  zh: '/images/flags/icon_zh.png',
  ru: '/images/flags/icon_ru.png',
};

const localeLabels = {
  en: 'English',
  fr: 'Français',
  zh: '中文',
  ru: 'Русский',
};

const localesWithFlags = rawLocales.map((code) => ({
  code,
  label: localeLabels[code] || code,
  flag: flagPaths[code] || '/images/flags/default.png',
}));

const selectedFlag = computed(() => {
  const match = localesWithFlags.find((l) => l.code === currentLocale.value);
  return match?.flag || '/images/flags/default.png';
});

const selectLanguage = (code) => {
  currentLocale.value = code;
  setLocale(code);
  open.value = false;
};
</script>

<style scoped>
.language-dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-toggle {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.flag {
  width: 24px;
  height: 18px;
  border-radius: 3px;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  display: flex;
  flex-direction: column;
  background: white;
  border: 1px solid #ccc;
  padding: 4px;
  border-radius: 6px;
  z-index: 1000;
}

.dropdown-menu li {
  list-style: none;
  margin: 4px 0;
  cursor: pointer;
}

.dropdown-menu li:hover {
  background-color: #f0f0f0;
}
</style>