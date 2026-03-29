export default defineAppConfig({
  ui: {
    colors: {
      primary: 'emerald',
      secondary: 'sky',
      neutral: 'slate',
    },
    icons: {
      chevronDown: 'i-lucide-chevron-down',
      check: 'i-lucide-check',
      close: 'i-lucide-x',
      external: 'i-lucide-arrow-up-right',
    },
    button: {
      slots: {
        base: 'relative inline-flex items-center justify-center rounded-[1rem] font-semibold disabled:cursor-not-allowed aria-disabled:cursor-not-allowed disabled:opacity-75 aria-disabled:opacity-75 transition-[background-color,color,border-color,box-shadow,transform,opacity] duration-200 focus-visible:outline-none active:translate-y-px',
      },
      defaultVariants: {
        color: 'primary',
        size: 'md',
      },
    },
    badge: {
      slots: {
        base: 'rounded-full font-semibold inline-flex items-center tracking-[0.01em]',
      },
      defaultVariants: {
        variant: 'soft',
        size: 'md',
      },
    },
    skeleton: {
      base: 'animate-pulse rounded-[1rem] bg-elevated/80 ring-1 ring-default/60',
    },
    card: {
      slots: {
        root: 'rounded-[1.75rem] border border-default/80 bg-default/90 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.26)] backdrop-blur-sm',
        header: 'px-5 py-5 sm:px-6 sm:py-5',
        body: 'px-5 py-5 sm:px-6 sm:py-6',
        footer: 'px-5 py-5 sm:px-6 sm:py-5',
      },
    },
    alert: {
      slots: {
        root: 'relative overflow-hidden w-full rounded-[1.25rem] border p-4 sm:p-5 flex gap-3 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.28)] backdrop-blur-sm',
        title: 'text-sm font-semibold',
        description: 'text-sm leading-6 opacity-90',
        actions: 'flex flex-wrap gap-2 shrink-0',
        close: 'p-0',
      },
    },
    input: {
      slots: {
        base: 'w-full rounded-[1rem] border-0 appearance-none placeholder:text-dimmed focus:outline-none disabled:cursor-not-allowed disabled:opacity-75 shadow-[inset_0_1px_0_rgba(255,255,255,0.38)] transition-[background-color,border-color,box-shadow,color]',
      },
      defaultVariants: {
        size: 'lg',
        variant: 'outline',
      },
    },
    textarea: {
      slots: {
        base: 'w-full rounded-[1rem] border-0 appearance-none placeholder:text-dimmed focus:outline-none disabled:cursor-not-allowed disabled:opacity-75 shadow-[inset_0_1px_0_rgba(255,255,255,0.38)] transition-[background-color,border-color,box-shadow,color]',
      },
      defaultVariants: {
        size: 'lg',
        variant: 'outline',
      },
    },
    select: {
      slots: {
        base: 'relative group rounded-[1rem] inline-flex items-center focus:outline-none disabled:cursor-not-allowed disabled:opacity-75 shadow-[inset_0_1px_0_rgba(255,255,255,0.38)] transition-[background-color,border-color,box-shadow,color]',
        content: 'max-h-60 w-(--reka-select-trigger-width) rounded-[1.25rem] border border-default/80 bg-default/95 shadow-[0_28px_80px_-44px_rgba(15,23,42,0.32)] ring-0 overflow-hidden data-[state=open]:animate-[scale-in_100ms_ease-out] data-[state=closed]:animate-[scale-out_100ms_ease-in] origin-(--reka-select-content-transform-origin) pointer-events-auto flex flex-col backdrop-blur-xl',
      },
      defaultVariants: {
        size: 'lg',
        variant: 'outline',
      },
    },
    header: {
      slots: {
        root: 'sticky top-0 z-50 h-(--ui-header-height) border-b border-default/70 bg-default/72 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.24)] backdrop-blur-2xl',
        header: 'px-4 sm:px-6 h-(--ui-header-height) shrink-0 flex items-center justify-between gap-3',
        body: 'p-4 sm:p-6 overflow-y-auto',
      },
    },
    modal: {
      slots: {
        content: 'bg-default/95 divide-y divide-default/70 flex flex-col focus:outline-none border border-default/80 backdrop-blur-2xl',
        header: 'flex items-center gap-2 p-5 sm:px-6 min-h-16',
        body: 'flex-1 p-5 sm:p-6',
        footer: 'flex items-center gap-2 p-5 sm:px-6',
        title: 'text-highlighted font-semibold',
        description: 'mt-1 text-muted text-sm leading-6',
      },
    },
    slideover: {
      slots: {
        overlay: 'fixed inset-0 bg-elevated/72 backdrop-blur-sm',
        content: 'fixed bg-default/95 divide-y divide-default/70 sm:border sm:border-default/80 sm:shadow-[0_28px_80px_-44px_rgba(15,23,42,0.32)] flex flex-col focus:outline-none backdrop-blur-2xl',
        header: 'flex items-center gap-2 p-5 sm:px-6 min-h-16',
        body: 'flex-1 overflow-y-auto p-5 sm:p-6',
        footer: 'flex items-center gap-2 p-5 sm:px-6',
        title: 'text-highlighted font-semibold',
        description: 'mt-1 text-muted text-sm leading-6',
      },
    },
  },
})
