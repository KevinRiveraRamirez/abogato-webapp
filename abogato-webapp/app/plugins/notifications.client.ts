export default defineNuxtPlugin(() => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const { ensureLoaded, refresh, reset, upsertFromRealtime } = useNotifications()

  let channel: ReturnType<typeof supabase.channel> | null = null
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  let pollingInterval: ReturnType<typeof setInterval> | null = null

  function clearReconnectTimeout() {
    if (!reconnectTimeout) return

    clearTimeout(reconnectTimeout)
    reconnectTimeout = null
  }

  function stopPolling() {
    if (!pollingInterval) return

    clearInterval(pollingInterval)
    pollingInterval = null
  }

  function startPolling() {
    stopPolling()

    pollingInterval = window.setInterval(async () => {
      if (document.visibilityState !== 'visible') return
      await refresh()
    }, 15000)
  }

  async function stopRealtime() {
    clearReconnectTimeout()

    if (!channel) return

    await supabase.removeChannel(channel)
    channel = null
  }

  function scheduleReconnect(userId: string) {
    if (reconnectTimeout) return

    reconnectTimeout = window.setTimeout(async () => {
      reconnectTimeout = null

      if (user.value?.id !== userId) return

      await stopRealtime()
      startRealtime(userId)
    }, 3000)
  }

  function startRealtime(userId: string) {
    channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_user_id=eq.${userId}`,
        },
        (payload) => {
          upsertFromRealtime(payload.new as Parameters<typeof upsertFromRealtime>[0])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_user_id=eq.${userId}`,
        },
        async () => {
          await refresh()
        }
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          clearReconnectTimeout()
          await refresh()
          return
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          scheduleReconnect(userId)
        }
      })
  }

  async function handleForegroundSync() {
    if (!user.value?.id) return
    await refresh()
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      handleForegroundSync()
    }
  }

  window.addEventListener('focus', handleForegroundSync)
  window.addEventListener('online', handleForegroundSync)
  document.addEventListener('visibilitychange', handleVisibilityChange)

  watch(
    () => user.value?.id ?? null,
    async (userId, previousUserId) => {
      if (userId === previousUserId && channel) return

      await stopRealtime()

      if (!userId) {
        stopPolling()
        reset()
        return
      }

      startPolling()
      await ensureLoaded()
      startRealtime(userId)
    },
    { immediate: true }
  )
})
