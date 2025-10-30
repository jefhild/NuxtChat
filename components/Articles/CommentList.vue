<!-- components/articles/CommentList.vue -->
<template>
  <div>
    <v-skeleton-loader v-if="loading" type="list-item@6" class="pa-2" />
    <template v-else>
      <template v-for="item in flatItems" :key="item.id">
        <!-- {{ item }} -->
          <!-- {{ item.author }} -->
        <CommentItem
          :id="item.id"
          :depth="item.depth"
          :author="item.author ?? item.authorProfile ?? null"
          :displayname="item.displayname"
          :avatar-url="item.avatarUrl"
          :sender-kind="item.senderKind"
          :created-at="item.createdAt"
          :content="item.content"
          :score="item.score"
          :my-vote="item.myVote"
          :is-op="false"
          :masked="item.masked"
          :deleted="item.deleted"
          :parent-name="parentName(item)"
          :parent-excerpt="parentExcerpt(item)"
          @reply="toggleReply"
          @vote="$emit('vote', $event)"
          @menu="$emit('menu', $event)"
        >
          <template #reply-composer>
            <v-expand-transition>
              <!-- Only render inline composer if allowed + active -->
              <div v-if="canReply && activeReplyId === item.id" class="mt-2">
                <ReplyInline
                  :model-value="drafts.get(item.id) || ''"
                  :disabled="!canReply"
                  @update:modelValue="val => drafts.set(item.id, val)"
                  @submit="txt => onSubmitReply(item.id, txt)"
                  @cancel="() => onCancelReply(item.id)"
                />
              </div>
            </v-expand-transition>
          </template>
        </CommentItem>
      </template>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, reactive, watch } from 'vue'
import CommentItem from './CommentItem.vue'
import ReplyInline from './ReplyInline.vue'

/**
 * Expected message shape (minimal):
 * { id, replyToMessageId, senderKind, content, createdAt, score, myVote,
 *   authorId, displayname, avatarUrl, masked?, deleted? }
 */
const props = defineProps({
  messages: { type: Array, required: true },
  meId: { type: String, default: null },
  loading: { type: Boolean, default: false },
  canReply: { type: Boolean, default: true },     
})
const emit = defineEmits(['reply', 'vote', 'menu', 'send-reply', 'login-request']) 

/* ---------------- helpers ---------------- */
const byId = computed(() => {
  const m = new Map()
  for (const msg of props.messages) m.set(msg.id, msg)
  return m
})

const parentName = (m) => {
  const p = m?.replyToMessageId ? byId.value.get(m.replyToMessageId) : null
  return p?.displayname || null
}
const parentExcerpt = (m) => {
  const p = m?.replyToMessageId ? byId.value.get(m.replyToMessageId) : null
  const txt = p?.content || ''
  return txt ? (txt.length > 100 ? txt.slice(0, 100) + '…' : txt) : null
}

const roots = computed(() =>
  props.messages
    .filter(m => !m.replyToMessageId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
)

const childrenMap = computed(() => {
  const map = new Map()
  for (const m of props.messages) {
    const pid = m.replyToMessageId
    if (!pid) continue
    if (!map.has(pid)) map.set(pid, [])
    map.get(pid).push(m)
  }
  map.forEach(arr => arr.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)))
  return map
})

/** Flatten to a single array with depth 0..2, stable order, no duplicates */
const flatItems = computed(() => {
  const out = []
  const pushDepth = (msg, depth) => out.push({ ...msg, depth })
  for (const r of roots.value) {
    pushDepth(r, 0)
    const c1 = childrenMap.value.get(r.id) || []
    for (const m1 of c1) {
      pushDepth(m1, 1)
      const c2 = childrenMap.value.get(m1.id) || []
      for (const m2 of c2) pushDepth(m2, 2)
    }
  }
  return out
})

/* ---------------- inline reply state ---------------- */
const activeReplyId = ref(null)
const drafts = reactive(new Map())

const toggleReply = (id) => {
  if (!props.canReply) {
    emit('login-request')              // 👈 ask parent to prompt login
    return
  }
  activeReplyId.value = (activeReplyId.value === id) ? null : id
}
const onSubmitReply = (id, text) => {
  emit('send-reply', { id, text })     // parent calls send(..., { replyToId: id })
  drafts.set(id, '')
  activeReplyId.value = null
}
const onCancelReply = (id) => {
  drafts.set(id, '')
  activeReplyId.value = null
}

// Close composer if the target message disappears
watch(() => props.messages.length, () => {
  if (activeReplyId.value && !byId.value.get(activeReplyId.value)) {
    activeReplyId.value = null
  }
})



</script>