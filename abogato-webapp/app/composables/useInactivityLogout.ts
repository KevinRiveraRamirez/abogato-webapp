// app/composables/useInactivityLogout.ts
export function useInactivityLogout(timeoutMs = 15 * 60 * 1000) {
  const supabase = useSupabaseClient()
  let timer: ReturnType<typeof setTimeout> | null = null

  const resetTimer = () => {
    if (timer) clearTimeout(timer)

    timer = setTimeout(async () => {
      await supabase.auth.signOut()
      await navigateTo('/login')
    }, timeoutMs)
  }

  const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']

  const start = () => {
    if (!import.meta.client) return
    events.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }))
    resetTimer()
  }

  const stop = () => {
    if (!import.meta.client) return
    events.forEach((event) => window.removeEventListener(event, resetTimer))
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  onMounted(start)
  onBeforeUnmount(stop)

  return { start, stop, resetTimer }
}