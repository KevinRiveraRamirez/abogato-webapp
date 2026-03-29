type FloatingPanelPosition = {
  left: number
  top: number
}

type UseFloatingPanelOptions = {
  storageKey: string
  viewportMargin?: number
  getBaseStyle?: () => Record<string, string>
  getDefaultPosition?: (panelRect: DOMRect) => FloatingPanelPosition
}

function isInteractiveFloatingPanelTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false

  return Boolean(
    target.closest('button, a, input, textarea, select, option, label, summary, [role="button"], [data-no-panel-drag]')
  )
}

export function useFloatingPanel(options: UseFloatingPanelOptions) {
  const panel = ref<HTMLElement | null>(null)
  const panelStyle = ref<Record<string, string>>({})
  const currentPosition = ref<FloatingPanelPosition | null>(null)
  const isDragging = ref(false)

  let dragOffsetX = 0
  let dragOffsetY = 0
  let hasDragged = false
  let ignoreOutsideClickUntil = 0

  const viewportMargin = options.viewportMargin ?? 16

  function readStoredPosition() {
    if (!import.meta.client) return null

    try {
      const raw = window.localStorage.getItem(options.storageKey)
      if (!raw) return null

      const parsed = JSON.parse(raw) as Partial<FloatingPanelPosition> | null
      if (typeof parsed?.left !== 'number' || typeof parsed?.top !== 'number') return null

      return parsed as FloatingPanelPosition
    } catch {
      return null
    }
  }

  function persistPosition(position: FloatingPanelPosition) {
    if (!import.meta.client) return

    window.localStorage.setItem(options.storageKey, JSON.stringify(position))
  }

  function clampPosition(position: FloatingPanelPosition, panelRect: DOMRect) {
    if (!import.meta.client) return position

    const maxLeft = Math.max(viewportMargin, window.innerWidth - panelRect.width - viewportMargin)
    const maxTop = Math.max(viewportMargin, window.innerHeight - panelRect.height - viewportMargin)

    return {
      left: Math.min(Math.max(position.left, viewportMargin), maxLeft),
      top: Math.min(Math.max(position.top, viewportMargin), maxTop),
    }
  }

  function getDefaultPosition(panelRect: DOMRect) {
    if (options.getDefaultPosition) return options.getDefaultPosition(panelRect)

    const top = window.innerWidth < 640 ? 72 : 88

    return {
      left: window.innerWidth - panelRect.width - viewportMargin,
      top,
    }
  }

  function applyPanelStyle(position: FloatingPanelPosition) {
    panelStyle.value = {
      ...(options.getBaseStyle?.() ?? {}),
      left: `${position.left}px`,
      top: `${position.top}px`,
    }
  }

  function updatePanelPosition() {
    if (!panel.value || !import.meta.client) return

    panelStyle.value = {
      ...(options.getBaseStyle?.() ?? {}),
    }

    const panelRect = panel.value.getBoundingClientRect()
    const nextPosition = clampPosition(
      currentPosition.value ?? readStoredPosition() ?? getDefaultPosition(panelRect),
      panelRect
    )

    currentPosition.value = nextPosition
    applyPanelStyle(nextPosition)
  }

  function startDragging(event: PointerEvent) {
    if (!panel.value || event.button !== 0) return
    if (isInteractiveFloatingPanelTarget(event.target)) return

    const panelRect = panel.value.getBoundingClientRect()
    dragOffsetX = event.clientX - panelRect.left
    dragOffsetY = event.clientY - panelRect.top
    hasDragged = false
    isDragging.value = true

    event.preventDefault()
  }

  function handlePointerMove(event: PointerEvent) {
    if (!isDragging.value || !panel.value) return

    const panelRect = panel.value.getBoundingClientRect()
    const nextPosition = clampPosition({
      left: event.clientX - dragOffsetX,
      top: event.clientY - dragOffsetY,
    }, panelRect)

    currentPosition.value = nextPosition
    applyPanelStyle(nextPosition)
    hasDragged = true
  }

  function stopDragging() {
    if (!isDragging.value) return

    isDragging.value = false

    if (currentPosition.value) {
      persistPosition(currentPosition.value)
    }

    if (hasDragged) {
      ignoreOutsideClickUntil = Date.now() + 150
    }
  }

  function shouldIgnoreOutsideClick() {
    return isDragging.value || Date.now() < ignoreOutsideClickUntil
  }

  onMounted(() => {
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopDragging)
    window.addEventListener('pointercancel', stopDragging)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', stopDragging)
    window.removeEventListener('pointercancel', stopDragging)
  })

  return {
    panel,
    panelStyle,
    updatePanelPosition,
    startDragging,
    shouldIgnoreOutsideClick,
  }
}
