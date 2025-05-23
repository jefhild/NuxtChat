<template>
  <div v-if="message.file_url">
    <div class="image-wrapper" v-if="message.file_type.startsWith('image/')">
      <NuxtImg 
        :src="message.file_url" 
        :alt="message.file_name" 
        class="preview-image" 
        :class="{ blurred: !accepted }" 
        @click="openFullscreen"
      />

      <v-btn 
        v-if="!accepted" 
        class="accept-button" 
        small 
        color="primary" 
        @click="accepted = true"
      >
        Accept Image
      </v-btn>
    </div>

    <v-dialog v-model="fullscreen" fullscreen persistent>
      <v-card>
        <v-toolbar dark color="primary">
          <v-btn icon @click="fullscreen = false"><v-icon>mdi-close</v-icon></v-btn>
          <v-toolbar-title>{{ message.file_name }}</v-toolbar-title>
        </v-toolbar>
        <v-card-text class="d-flex justify-center align-center fill-height">
          <NuxtImg :src="message.file_url" :alt="message.file_name" class="fullscreen-image" />
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>

  <div v-if="message.reply_to" class="reply-preview-box">
    <div class="text-caption font-italic text-grey">
      Replied to: "{{ message.reply_to.content }}"
    </div>
  </div>

  <div :class="['message', messageClass]">
    <div>{{ message.content }}</div>
    <div class="small">
      <v-icon icon="mdi-check" v-if="message.read" class="read-icon mr-3"></v-icon>
      <v-icon icon="mdi-check" v-else class="unread-icon mr-3"></v-icon>{{ formattedLocalDate }}
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";

const props = defineProps({
  message: Object,
  user: Object,
});
const accepted = ref(false);
const fullscreen = ref(false);

if(props.user.id === props.message.sender_id)
{
  accepted.value = true;
}

function openFullscreen()
{
  if (accepted.value) fullscreen.value = true;
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

.blurred {
  filter: blur(10px);
}

.fullscreen-image {
  max-width: 100%;
  max-height: 100%;
}
.message {
  margin-bottom: 4px;
  padding: 3px;
  border-radius: 10px;
  word-wrap: break-word;
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
</style>
