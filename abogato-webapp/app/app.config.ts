export default defineAppConfig({
  ui: {
    colors: {
      primary: 'emerald',
      neutral: 'slate',
    },
    icons: {
      chevronDown: 'i-lucide-chevron-down',
      check: 'i-lucide-check',
      close: 'i-lucide-x',
      external: 'i-lucide-arrow-up-right',
    },
    button: {
      defaultVariants: {
        color: 'primary',
      },
    },
    card: {
      slots: {
        root: 'rounded-2xl border border-default bg-default/90 shadow-sm backdrop-blur-sm',
        header: 'px-6 py-5 sm:px-7',
        body: 'px-6 py-5 sm:px-7',
        footer: 'px-6 py-5 sm:px-7',
      },
    },
    input: {
      defaultVariants: {
        size: 'lg',
        variant: 'outline',
      },
    },
    textarea: {
      defaultVariants: {
        size: 'lg',
        variant: 'outline',
      },
    },
    select: {
      defaultVariants: {
        size: 'lg',
        variant: 'outline',
      },
    },
  },
})
