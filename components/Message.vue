<template>
  <div v-if="message.file_url">
    <div class="image-wrapper" v-if="message.file_type.startsWith('image/')">
      <NuxtImg
        :src="message.file_url"
        :alt="message.file_name"
        class="preview-image"
        :class="{ blurred: !accepted }"
        @click.stop="openFullscreen"
      />

      <button
        v-if="!accepted"
        type="button"
        class="accept-button"
        @click.stop="accepted = true"
      >
        {{ $t("components.message.accept-image") }}
      </button>
    </div>
  </div>

  <div v-if="message.reply_to" class="reply-preview-box">
    <div class="reply-preview-text">
      {{ $t("components.message.replied-to") }} "{{ message.reply_to.content }}"
    </div>
  </div>

  <div v-if="isEditing" class="edit-container">
    <textarea
      ref="editTextareaRef"
      v-model="editedContent"
      rows="1"
      class="edit-textarea"
      @input="resizeEditTextarea"
      @keydown.ctrl.enter.prevent="saveEdit"
      @keydown.esc.prevent="cancelEdit"
    />
    <div class="edit-actions">
      <button
        type="button"
        class="edit-action edit-action--primary"
        @click="saveEdit"
        :disabled="
          saving ||
          !editedContent.trim() ||
          editedContent.trim() === message.content
        "
      >
        {{ $t("components.message.save") }}
      </button>
      <button
        type="button"
        class="edit-action edit-action--secondary"
        @click="cancelEdit"
        :disabled="saving"
      >
        {{ $t("components.message.cancel") }}
      </button>
    </div>
    <div class="edit-hint">
      {{ $t("components.message.edit-hint") }}
    </div>
  </div>

  <div v-else :class="['message', messageClass]" @dblclick="startEdit">
    <div class="message-content">
      {{ message.content }}
      <button
        v-if="message.sender_id === user.id && !message.file_url"
        type="button"
        class="edit-icon-button"
        @click.stop="startEdit"
      >
        <span class="mdi mdi-pencil edit-icon" aria-hidden="true" />
        <span class="sr-only">{{ $t("components.message.save") }}</span>
      </button>
    </div>
    <div class="small">
      <span
        v-if="message.read"
        class="mdi mdi-check read-icon"
        aria-hidden="true"
      />
      <span v-else class="mdi mdi-check unread-icon" aria-hidden="true" />
      {{ formattedLocalDate }}
      <span v-if="message.edited_at" class="edited-indicator">
        {{ $t("components.message.edited") }}
      </span>
    </div>
  </div>

  <Teleport to="body">
    <div
      v-if="fullscreen"
      class="media-dialog"
      role="dialog"
      aria-modal="true"
      @click.self="fullscreen = false"
    >
      <div class="media-dialog__card">
        <div class="media-dialog__header">
          <span class="media-dialog__title">{{ message.file_name }}</span>
          <button
            type="button"
            class="media-dialog__close"
            @click="fullscreen = false"
          >
            <span class="mdi mdi-close" aria-hidden="true" />
            <span class="sr-only">{{ $t("components.message.cancel") }}</span>
          </button>
        </div>
        <div class="media-dialog__body">
          <NuxtImg
            :src="message.file_url"
            :alt="message.file_name"
            class="popup-image"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
const { t } = useI18n();

const props = defineProps({
  message: Object,
  user: Object,
});

const emit = defineEmits(['edit-message','removeReplying']);

const accepted = ref(false);
const fullscreen = ref(false);
const isEditing = ref(false);
const editedContent = ref("");
const saving = ref(false);
const editTextareaRef = ref(null);

if (props.user.id === props.message.sender_id)
{
  accepted.value = true;
}

function openFullscreen()
{
  if (accepted.value) fullscreen.value = true;
}

function startEdit()
{
  emit('removeReplying');
  if (props.message.sender_id === props.user.id && !props.message.file_url)
  {
    isEditing.value = true;
    editedContent.value = props.message.content;
    nextTick(() => resizeEditTextarea());
  }
}

function resizeEditTextarea() {
  const textarea = editTextareaRef.value;
  if (!textarea) return;
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

async function saveEdit()
{
  emit('removeReplying');
  if (!editedContent.value.trim() || editedContent.value.trim() === props.message.content)
  {
    return;
  }

  saving.value = true;

  try
  {
    emit('edit-message', {
      messageId: props.message.id,
      newContent: editedContent.value.trim()
    });

    isEditing.value = false;
  } catch (error)
  {
    console.error('Error saving edit:', error);
  } finally
  {
    saving.value = false;
  }
}

function cancelEdit()
{
  emit('removeReplying');
  isEditing.value = false;
  editedContent.value = '';
}

const messageClass = computed(() =>
{
  if (props.message.sender_id === props.user.id) return "sent";
  switch (props.message.gender_id)
  {
    case 1: return "male";
    case 2: return "female";
    default: return "other";
  }
});

const formattedLocalDate = computed(() =>
{
  const date = new Date(props.message.created_at);
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    hour12: true,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }).format(date);
});
</script>

<style scoped>
.image-wrapper {
  position: relative;
  display: inline-block;
  max-width: 220px;
  max-height: 220px;
  margin-bottom: 8px;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
}

.preview-image {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 20px;
}

.accept-button {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
  backdrop-filter: blur(4px);
  border: 0;
  border-radius: 999px;
  padding: 0.55rem 0.95rem;
  background: rgb(var(--color-primary));
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.popup-image {
  max-width: 100%;
  max-height: 400px;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

.blurred {
  filter: blur(10px);
}

.message {
  margin-bottom: 4px;
  padding: 8px;
  border-radius: 10px;
  word-wrap: break-word;
  position: relative;
  transition: background-color 0.2s ease;
}

.message:hover .edit-icon {
  opacity: 1;
}

.reply-preview-box {
  margin-bottom: 0.35rem;
}

.reply-preview-text {
  font-size: 0.75rem;
  font-style: italic;
  color: rgb(var(--color-foreground) / 0.64);
}

.message-content {
  position: relative;
  display: inline-block;
  width: 100%;
}

.edit-icon-button {
  border: 0;
  background: transparent;
  padding: 0;
  margin: 0;
  position: absolute;
  right: -20px;
  top: 2px;
  cursor: pointer;
}

.edit-icon {
  opacity: 0;
  color: rgb(var(--color-foreground) / 0.5);
  transition: opacity 0.2s ease;
}

.edit-icon:hover {
  color: rgb(var(--color-foreground) / 0.8);
}

.edit-container {
  margin-bottom: 4px;
  padding: 8px;
  border-radius: 10px;
  background-color: rgb(var(--color-primary) / 0.08);
  border: 1px solid rgb(var(--color-primary) / 0.24);
}

.edit-textarea {
  width: 100%;
  min-height: 2.5rem;
  resize: none;
  margin-bottom: 8px;
  padding: 0.7rem 0.8rem;
  border-radius: 12px;
  border: 1px solid rgb(var(--color-border) / 0.8);
  background: rgb(var(--color-surface) / 0.94);
  color: rgb(var(--color-foreground) / 0.92);
  line-height: 1.45;
}

.edit-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
}

.edit-action {
  border: 0;
  border-radius: 999px;
  padding: 0.45rem 0.9rem;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 160ms ease, color 160ms ease, opacity 160ms ease;
}

.edit-action:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.edit-action--primary {
  background: rgb(var(--color-primary));
  color: #fff;
}

.edit-action--secondary {
  background: transparent;
  color: rgb(var(--color-foreground) / 0.78);
}

.edit-hint {
  font-size: 0.75em;
  color: rgb(var(--color-foreground) / 0.6);
}

.sent {
  align-self: flex-start;
  text-align: left;
}

.male {
  color: darkblue;
}

.female {
  color: darkred;
}

.other {
  color: purple;
}

.small {
  margin-top: 5px;
  font-size: 0.8em;
  color: rgb(var(--color-foreground) / 0.6);
}

.read-icon {
  color: #16a34a;
  font-size: 1.2em;
  margin-right: 0.45rem;
}

.unread-icon {
  color: rgb(var(--color-foreground) / 0.45);
  font-size: 1.2em;
  margin-right: 0.45rem;
}

.edited-indicator {
  font-style: italic;
  font-size: 0.9em;
  opacity: 0.7;
  margin-left: 0.5rem;
}

.media-dialog {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgb(15 23 42 / 0.72);
}

.media-dialog__card {
  width: min(100%, 600px);
  border-radius: 18px;
  border: 1px solid rgb(var(--color-border) / 0.7);
  background: rgb(var(--color-surface) / 0.98);
  box-shadow: 0 28px 60px rgb(var(--color-shadow) / 0.28);
}

.media-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.1rem 0.5rem;
}

.media-dialog__title {
  font-size: 1rem;
  font-weight: 600;
  color: rgb(var(--color-foreground) / 0.92);
}

.media-dialog__close {
  border: 0;
  background: transparent;
  color: rgb(var(--color-foreground) / 0.72);
  font-size: 1.25rem;
  cursor: pointer;
}

.media-dialog__body {
  display: flex;
  justify-content: center;
  padding: 0.5rem 1.1rem 1.1rem;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
