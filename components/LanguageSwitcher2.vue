<template>
  <div class="language-switcher">
    <Listbox v-model="currentLocale" @change="switchLanguage">
      <div class="relative">
        <!-- Selected flag button -->
        <ListboxButton class="flag-button">
          <img :src="selectedFlag" alt="Selected flag" class="flag-icon" />
        </ListboxButton>

        <!-- Dropdown with flag + language name -->
        <ListboxOptions class="options-list">
          <ListboxOption
            v-for="loc in localesWithFlags"
            :key="loc.code"
            :value="loc.code"
            class="option-item"
            v-slot="{ active, selected }"
          >
            <span :class="['flag-label', { active, selected }]">
              <img :src="loc.flag" alt="" class="flag-icon-sm" />
              <span class="label-text">{{ localeLabels[loc.code] }}</span>
            </span>
          </ListboxOption>
        </ListboxOptions>
      </div>
    </Listbox>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
} from '@headlessui/vue';

const { locale, availableLocales: rawLocales, setLocale } = useI18n();
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

const localesWithFlags = rawLocales.map(code => ({
  code,
  flag: flagPaths[code] || '/images/flags/default.png',
}));

const selectedFlag = computed(() => {
  return localesWithFlags.find(l => l.code === currentLocale.value)?.flag || '/images/flags/default.png';
});

const switchLanguage = () => {
  setLocale(currentLocale.value);
};
</script>

<style scoped>
.language-switcher {
  display: inline-block;
}

.flag-button {
  width: 40px;
  height: 30px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.flag-icon {
  width: 24px;
  height: 18px;
}

.options-list {
  position: absolute;
  margin-top: 4px;
  background: white;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  border-radius: 6px;
  z-index: 10;
  padding: 4px 0;
}

.option-item {
  padding: 6px 12px;
  cursor: pointer;
}

.flag-label {
  display: flex;
  align-items: center;
}
.flag-icon-sm {
  width: 24px;
  height: 18px;
  margin-right: 8px;
}
.label-text {
  font-size: 14px;
}

.flag-label.active {
  background-color: #f0f0f0;
}

.flag-label.selected .label-text {
  font-weight: bold;
}
</style>