<template>
  <div v-if="message.file_url">
    <a :href="message.file_url" target="_blank">
      <img v-if="message.file_type.startsWith('image/')" :src="message.file_url"
        style="max-width: 200px; max-height: 200px; border: 1px solid #ccc" />
      <v-icon v-else>mdi-file</v-icon>Download File ({{ message.file_name }})
    </a>
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
import { computed } from "vue";

const props = defineProps({
  message: {
    type: Object,
    required: true,
  },
  user: {
    type: Object,
    required: true,
  },
});

const messageClass = computed(() => {
  if (props.message.sender_id === props.user.id) {
    return "sent";
  } else {
    switch (props.message.gender_id) {
      case 1:
        return "male";
      case 2:
        return "female";
      default:
        return "other";
    }
  }
});

const formattedLocalDate = computed(() => {
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
  display: block;
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
