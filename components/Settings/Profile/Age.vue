<template>
  <label class="profile-field">
    <span class="profile-field__label">{{ $t('components.profile-age.age') }}</span>
    <select
      :disabled="!props.isEditable"
      v-model="age"
      class="profile-field__control"
    >
      <option
        v-for="item in getAgeList()"
        :key="item.age"
        :value="item.age"
      >
        {{ item.age }}
      </option>
    </select>
  </label>
</template>

<script setup>
import { useI18n } from "vue-i18n";
const { t } = useI18n();
const items = ref([]);

const props = defineProps({
  age: {
    type: Number,
    required: true,
  },
  isEditable: {
    type: Boolean,
    required: true,
  },
});

const emits = defineEmits(["updateAge"]);

const age = ref(props.age);

const getAgeList = () => {
  const ageList = [];
  for (let i = 18; i <= 65; i++) {
    ageList.push({ age: i });
  }
  return ageList;
};

watch(age, (newAge) => {
  emits("updateAge", newAge);
});
</script>

<style scoped>
.profile-field {
  display: grid;
  gap: 0.35rem;
}

.profile-field__label {
  color: rgb(var(--color-foreground) / 0.82);
  font-size: 0.9rem;
  font-weight: 600;
}

.profile-field__control {
  width: 100%;
  min-height: 2.75rem;
  border: 1px solid rgb(var(--color-border) / 0.82);
  border-radius: 12px;
  background: rgb(var(--color-surface));
  color: rgb(var(--color-foreground));
  padding: 0.7rem 0.85rem;
  font-size: 1rem;
  color-scheme: light dark;
}

.profile-field__control:disabled {
  opacity: 1;
  cursor: default;
  background: rgb(var(--color-surface) / 0.76);
  color: rgb(var(--color-foreground) / 0.62);
}
</style>
