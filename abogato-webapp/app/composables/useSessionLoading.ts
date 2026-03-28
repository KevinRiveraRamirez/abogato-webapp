type SessionLoadingOptions = {
  title?: string
  description?: string
}

export function useSessionLoading() {
  const active = useState<boolean>('session-loading:active', () => false)
  const title = useState<string>('session-loading:title', () => 'Preparando tu panel')
  const description = useState<string>(
    'session-loading:description',
    () => 'Estamos iniciando tu sesión y cargando la información principal.'
  )

  function start(options: SessionLoadingOptions = {}) {
    title.value = options.title ?? 'Preparando tu panel'
    description.value = options.description ?? 'Estamos iniciando tu sesión y cargando la información principal.'
    active.value = true
  }

  function finish() {
    active.value = false
  }

  return {
    active,
    title,
    description,
    start,
    finish,
  }
}
