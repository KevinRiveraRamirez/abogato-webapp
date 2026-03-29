export function useAppShell() {
  const collapsed = useState<boolean>('app-shell:collapsed', () => true)
  const mobileOpen = useState<boolean>('app-shell:mobile-open', () => false)

  function toggleCollapsed() {
    collapsed.value = !collapsed.value
  }

  function toggleMobile() {
    mobileOpen.value = !mobileOpen.value
  }

  function closeMobile() {
    mobileOpen.value = false
  }

  return {
    collapsed,
    mobileOpen,
    toggleCollapsed,
    toggleMobile,
    closeMobile,
  }
}
