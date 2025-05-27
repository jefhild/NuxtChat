<template>
  <div v-if="message.file_url">
    <div class="image-wrapper" v-if="message.file_type.startsWith('image/')">
      <NuxtImg :src="message.file_url" :alt="message.file_name" class="preview-image" :class="{ blurred: !accepted }"
        @click.stop="openFullscreen" />

      <v-btn v-if="!accepted" class="accept-button" small color="primary" @click.stop="accepted = true">
        Accept Image
      </v-btn>
    </div>
  </div>

  <div v-if="message.reply_to" class="reply-preview-box">
    <div class="text-caption font-italic text-grey">
      Replied to: "{{ message.reply_to.content }}"
    </div>
  </div>

  <!-- Edit Mode -->
  <div v-if="isEditing" class="edit-container">
    <v-textarea v-model="editedContent" :rows="1" auto-grow variant="outlined" density="compact" class="edit-textarea"
      @keydown.ctrl.enter="saveEdit" @keydown.esc="cancelEdit" />
    <div class="edit-actions">
      <v-btn size="small" color="primary" variant="flat" @click="saveEdit" :loading="saving"
        :disabled="!editedContent.trim() || editedContent.trim() === message.content">
        Save
      </v-btn>
      <v-btn size="small" variant="text" @click="cancelEdit" :disabled="saving">
        Cancel
      </v-btn>
    </div>
    <div class="edit-hint text-caption text-grey">
      Ctrl+Enter to save • Esc to cancel
    </div>
  </div>

  <!-- Normal Message Display -->
  <div v-else :class="['message', messageClass]" @dblclick="startEdit">
    <div class="message-content">
      {{ message.content }}
      <v-icon v-if="message.sender_id === user.id && !message.file_url" class="edit-icon" size="14"
        @click.stop="startEdit">
        mdi-pencil
      </v-icon>
    </div>
    <div class="small">
      <v-icon icon="mdi-check" v-if="message.read" class="read-icon mr-3"></v-icon>
      <v-icon icon="mdi-check" v-else class="unread-icon mr-3"></v-icon>
      {{ formattedLocalDate }}
      <span v-if="message.edited_at" class="edited-indicator ml-2">(edited)</span>
    </div>
  </div>

  <v-dialog v-model="fullscreen" max-width="600">
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        <span class="text-h6">{{ message.file_name }}</span>
        <v-btn icon @click="fullscreen = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text class="d-flex justify-center">
        <NuxtImg :src="message.file_url" :alt="message.file_name" class="popup-image" />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, ref } from "vue";

const props = defineProps({
  message: Object,
  user: Object,
});

const emit = defineEmits(['edit-message']);

const accepted = ref(false);
const fullscreen = ref(false);
const isEditing = ref(false);
const editedContent = ref('');
const saving = ref(false);

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
  // Only allow editing own messages without files
  if (props.message.sender_id === props.user.id && !props.message.file_url)
  {
    isEditing.value = true;
    editedContent.value = props.message.content;
  }
}

async function saveEdit()
{
  if (!editedContent.value.trim() || editedContent.value.trim() === props.message.content)
  {
    return;
  }

  saving.value = true;

  try
  {
    // Emit the edit event to parent component
    await emit('edit-message', {
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
  return new Intl.DateTimeFormat("en-US", {
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

.message-content {
  position: relative;
  display: inline-block;
  width: 100%;
}

.edit-icon {
  opacity: 0;
  position: absolute;
  right: -20px;
  top: 2px;
  cursor: pointer;
  color: rgba(0, 0, 0, 0.5);
  transition: opacity 0.2s ease;
}

.edit-icon:hover {
  color: rgba(0, 0, 0, 0.8);
}

.edit-container {
  margin-bottom: 4px;
  padding: 8px;
  border-radius: 10px;
  background-color: rgba(25, 118, 210, 0.05);
  border: 1px solid rgba(25, 118, 210, 0.2);
}

.edit-textarea {
  margin-bottom: 8px;
}

.edit-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
}

.edit-hint {
  font-size: 0.75em;
  color: rgba(0, 0, 0, 0.6);
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
  color: gray;
}

.read-icon {
  color: green;
  font-size: 1.2em;
  margin-left: 3px;
}

.unread-icon {
  color: gray;
  font-size: 1.2em;
  margin-left: 3px;
}

.edited-indicator {
  font-style: italic;
  font-size: 0.9em;
  opacity: 0.7;
}
</style>