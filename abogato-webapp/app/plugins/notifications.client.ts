export default defineNuxtPlugin(() => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const { refresh, reset } = useNotifications()

  let channel: ReturnType<typeof supabase.channel> | null = null

  async function stopRealtime() {
    if (!channel) return

    await supabase.removeChannel(channel)
    channel = null
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
        async () => {
          await refresh()
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
      .subscribe()
  }

  watch(
    () => user.value?.id ?? null,
    async (userId, previousUserId) => {
      if (userId === previousUserId && channel) return

      await stopRealtime()

      if (!userId) {
        reset()
        return
      }

      await refresh()
      startRealtime(userId)
    },
    { immediate: true }
  )
})
