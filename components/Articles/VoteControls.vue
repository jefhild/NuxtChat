<!-- <script setup>
const props = defineProps({
  score: { type: Number, default: 0 },
  myVote: { type: Number, default: 0 },
  disabled: { type: Boolean, default: true }, // keep disabled by default
})
// no emits yet; this is a placeholder
</script>

<template>
  <div class="d-flex align-center ga-1 text-disabled">
    <v-btn icon variant="text" density="comfortable" :disabled="true">
      <v-icon size="18">mdi-arrow-up-bold</v-icon>
    </v-btn>
    <span class="text-caption">{{ props.score }}</span>
    <v-btn icon variant="text" density="comfortable" :disabled="true">
      <v-icon size="18">mdi-arrow-down-bold</v-icon>
    </v-btn>
  </div>
</template> -->


<template>
  <div class="d-flex align-center ga-1 text-disabled">
    <v-btn
      icon
      variant="text"
      density="comfortable"
      :disabled="disabled || !canVote"
      :color="currentVote === 1 ? 'primary' : undefined"
      @click="handleVote(1)"
    >
      <v-icon size="18">mdi-arrow-up-bold</v-icon>
    </v-btn>

    <span class="text-caption">{{ currentScore }}</span>

    <v-btn
      icon
      variant="text"
      density="comfortable"
      :disabled="disabled || !canVote"
      :color="currentVote === -1 ? 'primary' : undefined"
      @click="handleVote(-1)"
    >
      <v-icon size="18">mdi-arrow-down-bold</v-icon>
    </v-btn>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useVoting } from '@/composables/useVoting'

const props = defineProps({
  id: { type: String, required: true },         // threadId or messageId
  target: { type: String, required: true },     // 'thread' | 'message'
  score: { type: Number, default: 0 },
  myVote: { type: Number, default: 0 },         // -1 | 0 | 1
  disabled: { type: Boolean, default: true },
})

const emit = defineEmits(['update:score', 'update:myVote', 'vote'])

const { canVote, voteThread, voteMessage } = useVoting()
const currentVote = ref(props.myVote)
const currentScore = ref(props.score)

watch(
  () => props.myVote,
  (val) => { currentVote.value = val }
)
watch(
  () => props.score,
  (val) => { currentScore.value = val }
)

async function handleVote(value) {
  if (props.disabled || !canVote.value) return

  try {
    const res =
      props.target === 'thread'
        ? await voteThread(props.id, value)
        : await voteMessage(props.id, value)

    currentVote.value = res.userVote
    currentScore.value = res.score

    emit('update:score', res.score)
    emit('update:myVote', res.userVote)
     // also emit a single consolidated event for parents
    emit('vote', {
      id: props.id,
      target: props.target,
      value,                 // what user clicked
      myVote: res.userVote,  // server result after toggle/flip
      score: res.score,
      today: res.today,
    })
  } catch (err) {
    console.error('vote error:', err)
  }
}
</script>