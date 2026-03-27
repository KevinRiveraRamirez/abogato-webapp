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

const iconClassMap: Record<NotificationTone, string> = {
  primary: 'border-emerald-200/80 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/20 dark:text-emerald-300',
  success: 'border-green-200/80 bg-green-500/10 text-green-700 dark:border-green-400/20 dark:text-green-300',
  warning: 'border-amber-200/80 bg-amber-500/10 text-amber-700 dark:border-amber-400/20 dark:text-amber-300',
  info: 'border-sky-200/80 bg-sky-500/10 text-sky-700 dark:border-sky-400/20 dark:text-sky-300',
  error: 'border-rose-200/80 bg-rose-500/10 text-rose-700 dark:border-rose-400/20 dark:text-rose-300',
  neutral: 'border-slate-200/80 bg-slate-500/10 text-slate-700 dark:border-slate-400/20 dark:text-slate-300',
}

const pillClassMap: Record<NotificationTone, string> = {
  primary: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  success: 'bg-green-500/10 text-green-700 dark:text-green-300',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  info: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  error: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  neutral: 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
}

const cardClass = computed(() =>
  props.notification.read_at
    ? 'border-default/80 bg-default/85'
    : 'border-primary/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(240,253,250,0.9))] shadow-[0_12px_30px_-22px_rgba(16,185,129,0.45)] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.95),rgba(6,78,59,0.22))]'
)

const iconClass = computed(() => iconClassMap[meta.value.tone] ?? iconClassMap.neutral)
const pillClass = computed(() => pillClassMap[meta.value.tone] ?? pillClassMap.neutral)
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
    class="group flex w-full items-start gap-3 rounded-[1.4rem] border px-4 py-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_14px_36px_-26px_rgba(15,23,42,0.35)]"
    :class="cardClass"
    @click="$emit('select', notification)"
  >
    <div
      class="relative mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border"
      :class="iconClass"
    >
      <UIcon :name="meta.icon" class="h-5 w-5" />

      <span
        v-if="!notification.read_at"
        class="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-slate-950"
      />
    </div>

    <div class="min-w-0 flex-1">
      <div class="flex items-start justify-between gap-3">
        <p class="line-clamp-2 flex-1 text-[15px] font-semibold leading-6 text-highlighted">
          {{ notification.title }}
        </p>

        <UIcon
          name="i-lucide-chevron-right"
          class="mt-1 h-4 w-4 shrink-0 text-toned transition group-hover:translate-x-0.5"
        />
      </div>

      <p
        v-if="notification.body"
        class="mt-2 line-clamp-2 text-sm leading-6 text-muted"
      >
        {{ notification.body }}
      </p>

      <div class="mt-3 flex flex-wrap items-center gap-2">
        <span
          class="rounded-full px-2.5 py-1 text-xs font-medium"
          :class="pillClass"
        >
          {{ meta.label }}
        </span>

        <span
          v-if="!notification.read_at"
          class="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300"
        >
          Nuevo
        </span>
      </div>

      <time
        class="mt-3 block text-xs text-toned"
        :datetime="notification.created_at"
        :title="exactDate"
      >
        {{ relativeDate }}
      </time>
    </div>
  </button>
</template>
