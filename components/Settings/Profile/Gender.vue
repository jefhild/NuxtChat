<template>
  <label class="ui-settings-field">
    <span class="ui-settings-field__label">Gender</span>
    <select
      :disabled="!props.isEditable"
      :value="String(props.genderId ?? '')"
      class="ui-settings-field__control"
      @change="emit('updateGenderId', Number($event.target.value))"
    >
      <option
        v-for="gender in props.genders"
        :key="gender.id"
        :value="gender.id"
      >
        {{ gender.name }}
      </option>
    </select>
  </label>
</template>

<script setup>
const props = defineProps({
  genderId: Number,
  genders: Array,
  isEditable: Boolean,
});

const emit = defineEmits(["updateGenderId", "validation"]);
</script>
