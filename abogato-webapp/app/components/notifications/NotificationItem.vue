<script setup lang="ts">
import { getNotificationMeta, type NotificationTone } from '~~/shared/notifications/catalog'
import type { NotificationRecord } from '~~/shared/types/notification'

const props = defineProps<{
  notification: NotificationRecord
}>()

defineEmits<{
  select: [notification: NotificationRecord]
}>()

const meta = computed(() => getNotificationMeta(props.notification.type))

const toneClassMap: Record<NotificationTone, string> = {
  primary: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
  success: 'bg-green-500/12 text-green-700 dark:text-green-300',
  warning: 'bg-amber-500/12 text-amber-700 dark:text-amber-300',
  info: 'bg-sky-500/12 text-sky-700 dark:text-sky-300',
  error: 'bg-rose-500/12 text-rose-700 dark:text-rose-300',
  neutral: 'bg-slate-500/12 text-slate-700 dark:text-slate-300',
}

const iconClass = computed(() => toneClassMap[meta.value.tone] ?? toneClassMap.neutral)
const relativeDate = computed(() => formatRelativeDate(props.notification.created_at))
const exactDate = computed(() =>
  new Date(props.notification.created_at).toLocaleString('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
)

function formatRelativeDate(value: string) {
  const timestamp = new Date(value).getTime()

  if (Number.isNaN(timestamp)) {
    return 'Hace un momento'
  }

  const diffInSeconds = Math.round((timestamp - Date.now()) / 1000)
  const absSeconds = Math.abs(diffInSeconds)
  const formatter = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

  if (absSeconds < 60) {
    return formatter.format(diffInSeconds, 'second')
  }

  const diffInMinutes = Math.round(diffInSeconds / 60)
  if (Math.abs(diffInMinutes) < 60) {
    return formatter.format(diffInMinutes, 'minute')
  }

  const diffInHours = Math.round(diffInMinutes / 60)
  if (Math.abs(diffInHours) < 24) {
    return formatter.format(diffInHours, 'hour')
  }

  const diffInDays = Math.round(diffInHours / 24)
  if (Math.abs(diffInDays) < 30) {
    return formatter.format(diffInDays, 'day')
  }

  const diffInMonths = Math.round(diffInDays / 30)
  if (Math.abs(diffInMonths) < 12) {
    return formatter.format(diffInMonths, 'month')
  }

  const diffInYears = Math.round(diffInMonths / 12)
  return formatter.format(diffInYears, 'year')
}
</script>

<template>
  <button
    type="button"
    class="flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-elevated/70"
    :class="notification.read_at ? 'bg-default' : 'bg-primary/5'"
    @click="$emit('select', notification)"
  >
    <div
      class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
      :class="iconClass"
    >
      <UIcon :name="meta.icon" class="h-5 w-5" />
    </div>

    <div class="min-w-0 flex-1">
      <div class="flex items-start gap-2">
        <p class="line-clamp-1 flex-1 text-sm font-semibold text-highlighted">
          {{ notification.title }}
        </p>

        <span
          v-if="!notification.read_at"
          class="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500"
        />
      </div>

      <p
        v-if="notification.body"
        class="mt-1 line-clamp-2 text-sm text-muted"
      >
        {{ notification.body }}
      </p>

      <div class="mt-2 flex items-center gap-2 text-xs text-toned">
        <span>{{ meta.label }}</span>
        <span aria-hidden="true">•</span>
        <time :datetime="notification.created_at" :title="exactDate">
          {{ relativeDate }}
        </time>
      </div>
    </div>
  </button>
</template>
