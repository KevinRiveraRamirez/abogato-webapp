export const useAiChat = () => {
  const loading = ref(false)
  const error = ref<string | null>(null)

  const sendMessage = async (message: string) => {
    loading.value = true
    error.value = null

    try {
      const response = await $fetch<{
        ok: boolean
        reply: string
        suggestTicket: boolean
      }>('/api/assistant/chat', {
        method: 'POST',
        body: { message },
      })

      return response
    } catch (err: any) {
      error.value =
        err?.data?.statusMessage ||
        err?.message ||
        'Error enviando mensaje'
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    sendMessage,
  }
}