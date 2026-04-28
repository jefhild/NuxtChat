<template>
  <label class="ui-settings-field">
    <span class="ui-settings-field__label">{{ $t('components.profile-age.age') }}</span>
    <select
      :disabled="!props.isEditable"
      v-model="age"
      class="ui-settings-field__control"
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
