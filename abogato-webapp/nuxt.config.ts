import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const missingUiContentThemes = {
  "ui/content/content-navigation": `export default {
  slots: {
    root: '',
    content: 'data-[state=open]:animate-[accordion-down_200ms_ease-out] data-[state=closed]:animate-[accordion-up_200ms_ease-out] overflow-hidden focus:outline-none',
    list: 'isolate -mx-2.5 -mt-1.5',
    item: '',
    listWithChildren: 'ms-5 border-s border-default',
    itemWithChildren: 'flex flex-col data-[state=open]:mb-1.5',
    trigger: 'font-semibold',
    link: 'group relative w-full px-2.5 py-1.5 before:inset-y-px before:inset-x-0 flex items-center gap-1.5 text-sm before:absolute before:z-[-1] before:rounded-md focus:outline-none focus-visible:outline-none focus-visible:before:ring-inset focus-visible:before:ring-2',
    linkLeadingIcon: 'shrink-0 size-5',
    linkTrailing: 'ms-auto inline-flex gap-1.5 items-center',
    linkTrailingBadge: 'shrink-0',
    linkTrailingBadgeSize: 'sm',
    linkTrailingIcon: 'size-5 transform transition-transform duration-200 shrink-0 group-data-[state=open]:rotate-180',
    linkTitle: 'truncate',
    linkTitleExternalIcon: 'size-3 align-top text-dimmed'
  },
  variants: {
    color: {
      primary: {
        trigger: 'focus-visible:ring-primary',
        link: 'focus-visible:before:ring-primary'
      },
      secondary: {
        trigger: 'focus-visible:ring-secondary',
        link: 'focus-visible:before:ring-secondary'
      },
      success: {
        trigger: 'focus-visible:ring-success',
        link: 'focus-visible:before:ring-success'
      },
      info: {
        trigger: 'focus-visible:ring-info',
        link: 'focus-visible:before:ring-info'
      },
      warning: {
        trigger: 'focus-visible:ring-warning',
        link: 'focus-visible:before:ring-warning'
      },
      error: {
        trigger: 'focus-visible:ring-error',
        link: 'focus-visible:before:ring-error'
      },
      neutral: {
        trigger: 'focus-visible:ring-inverted',
        link: 'focus-visible:before:ring-inverted'
      }
    },
    highlightColor: {
      primary: '',
      secondary: '',
      success: '',
      info: '',
      warning: '',
      error: '',
      neutral: ''
    },
    variant: {
      pill: '',
      link: ''
    },
    active: {
      true: {
        link: 'font-medium'
      },
      false: {
        link: 'text-muted',
        linkLeadingIcon: 'text-dimmed'
      }
    },
    disabled: {
      true: {
        trigger: 'data-[state=open]:text-highlighted'
      }
    },
    highlight: {
      true: {}
    },
    level: {
      true: {
        item: 'ps-1.5 -ms-px',
        itemWithChildren: 'ps-1.5 -ms-px'
      }
    }
  },
  defaultVariants: {
    color: 'primary',
    highlightColor: 'primary',
    variant: 'pill'
  }
}
`,
  "ui/content/content-search": `export default {
  slots: {
    modal: '',
    input: ''
  },
  variants: {
    fullscreen: {
      false: {
        modal: 'sm:max-w-3xl h-full sm:h-[28rem]'
      }
    },
    size: {
      xs: {},
      sm: {},
      md: {},
      lg: {},
      xl: {}
    }
  },
  defaultVariants: {
    size: 'md'
  }
}
`,
  "ui/content/content-search-button": `export default {
  slots: {
    base: '',
    label: '',
    trailing: 'hidden lg:flex items-center gap-0.5 ms-auto'
  },
  variants: {
    collapsed: {
      true: {
        label: 'hidden',
        trailing: 'lg:hidden'
      }
    }
  }
}
`,
  "ui/content/content-surround": `export default {
  slots: {
    root: 'grid grid-cols-1 sm:grid-cols-2 gap-8',
    link: 'group block px-6 py-8 rounded-lg border border-default hover:bg-elevated/50 focus-visible:outline-primary transition-colors',
    linkLeading: 'inline-flex items-center rounded-full p-1.5 bg-elevated group-hover:bg-primary/10 ring ring-accented mb-4 group-hover:ring-primary/50 transition',
    linkLeadingIcon: 'size-5 shrink-0 text-highlighted group-hover:text-primary transition-[color,translate]',
    linkTitle: 'font-medium text-[15px] text-highlighted mb-1 truncate',
    linkDescription: 'text-sm text-muted line-clamp-2'
  },
  variants: {
    direction: {
      left: {
        linkLeadingIcon: 'group-active:-translate-x-0.5'
      },
      right: {
        link: 'text-right',
        linkLeadingIcon: 'group-active:translate-x-0.5'
      }
    }
  }
}
`,
  "ui/content/content-toc": `export default {
  slots: {
    root: 'sticky top-(--ui-header-height) z-10 bg-default/75 lg:bg-[initial] backdrop-blur -mx-4 px-4 sm:px-6 sm:-mx-6 overflow-y-auto max-h-[calc(100vh-var(--ui-header-height))]',
    container: 'pt-4 sm:pt-6 pb-2.5 sm:pb-4.5 lg:py-8 border-b border-dashed border-default lg:border-0 flex flex-col',
    top: '',
    bottom: 'hidden lg:flex lg:flex-col gap-6',
    trigger: 'group text-sm font-semibold flex-1 flex items-center gap-1.5 py-1.5 -mt-1.5 focus-visible:outline-primary',
    title: 'truncate',
    trailing: 'ms-auto inline-flex gap-1.5 items-center',
    trailingIcon: 'size-5 transform transition-transform duration-200 shrink-0 group-data-[state=open]:rotate-180 lg:hidden',
    content: 'data-[state=open]:animate-[collapsible-down_200ms_ease-out] data-[state=closed]:animate-[collapsible-up_200ms_ease-out] overflow-hidden focus:outline-none',
    list: 'min-w-0',
    listWithChildren: 'ms-3',
    item: 'min-w-0',
    itemWithChildren: '',
    link: 'group relative text-sm flex items-center focus-visible:outline-primary py-1',
    linkText: 'truncate',
    indicator: 'absolute ms-2.5 transition-[translate,height] duration-200 h-(--indicator-size) translate-y-(--indicator-position) w-px rounded-full'
  },
  variants: {
    color: {
      primary: '',
      secondary: '',
      success: '',
      info: '',
      warning: '',
      error: '',
      neutral: ''
    },
    highlightColor: {
      primary: {
        indicator: 'bg-primary'
      },
      secondary: {
        indicator: 'bg-secondary'
      },
      success: {
        indicator: 'bg-success'
      },
      info: {
        indicator: 'bg-info'
      },
      warning: {
        indicator: 'bg-warning'
      },
      error: {
        indicator: 'bg-error'
      },
      neutral: {
        indicator: 'bg-inverted'
      }
    },
    active: {
      false: {
        link: 'text-muted hover:text-default transition-colors'
      }
    },
    highlight: {
      true: {
        list: 'ms-2.5 ps-4 border-s border-default',
        item: '-ms-px'
      }
    },
    body: {
      true: {
        bottom: 'mt-6'
      }
    }
  },
  defaultVariants: {
    color: 'primary',
    highlightColor: 'primary'
  }
}
`,
} as const

const missingUiProseThemes = [
  "ui/prose/a",
  "ui/prose/accordion",
  "ui/prose/accordion-item",
  "ui/prose/badge",
  "ui/prose/blockquote",
  "ui/prose/callout",
  "ui/prose/card",
  "ui/prose/card-group",
  "ui/prose/code",
  "ui/prose/code-collapse",
  "ui/prose/code-group",
  "ui/prose/code-icon",
  "ui/prose/code-preview",
  "ui/prose/code-tree",
  "ui/prose/collapsible",
  "ui/prose/em",
  "ui/prose/field",
  "ui/prose/field-group",
  "ui/prose/h1",
  "ui/prose/h2",
  "ui/prose/h3",
  "ui/prose/h4",
  "ui/prose/hr",
  "ui/prose/icon",
  "ui/prose/img",
  "ui/prose/kbd",
  "ui/prose/li",
  "ui/prose/ol",
  "ui/prose/p",
  "ui/prose/pre",
  "ui/prose/steps",
  "ui/prose/strong",
  "ui/prose/table",
  "ui/prose/tabs",
  "ui/prose/tabs-item",
  "ui/prose/tbody",
  "ui/prose/td",
  "ui/prose/th",
  "ui/prose/thead",
  "ui/prose/tr",
  "ui/prose/ul",
] as const

export default defineNuxtConfig({
  css: ["~/assets/css/main.css"],
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  ssr: false,
  buildDir: ".nuxt",
  runtimeConfig: {
    padronImportSecret: process.env.PADRON_IMPORT_SECRET,
    padronTsePageUrl: process.env.PADRON_TSE_PAGE_URL ?? "https://www.tse.go.cr/descarga_padron.html",
    padronTseZipUrl: process.env.PADRON_TSE_ZIP_URL ?? "",
    supabaseUrl: process.env.SUPABASE_URL ?? process.env.NUXT_PUBLIC_SUPABASE_URL,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "",
    groqApiKey: process.env.GROQ_API_KEY,
  },
  routeRules: {
    "/about/about": { redirect: "/about" },
    "/contact/contact": { redirect: "/contact" },
    "/dashboard/products": { redirect: "/admin/dashboard" },
    "/recurso/recursos": { redirect: "/recursos" },
    "/servicios/servicios": { redirect: "/servicios" },
  },

  modules: [
    "@nuxt/eslint",
    "@nuxt/image",
    "@nuxt/ui",
    "@nuxtjs/supabase",
  ],

  ui: {
    content: false,
  },
  hooks: {
    async "app:templatesGenerated"(app) {
      const uiTemplates = app.templates
        .map((template) => template.filename)
        .filter((filename): filename is string => typeof filename === "string" && filename.startsWith("ui/") && filename.endsWith(".ts"))

      for (const filename of uiTemplates) {
        const proxyFilename = filename.slice(0, -3)
        const proxyPath = resolve(".nuxt", proxyFilename)

        await mkdir(dirname(proxyPath), { recursive: true })
        await writeFile(
          proxyPath,
          `export { default } from '#build/${filename}'\n`,
          "utf8",
        )
      }

      for (const [filename, source] of Object.entries(missingUiContentThemes)) {
        const themePath = resolve(".nuxt", `${filename}.ts`)
        const proxyPath = resolve(".nuxt", filename)

        await mkdir(dirname(themePath), { recursive: true })
        await writeFile(themePath, source, "utf8")
        await writeFile(
          proxyPath,
          `export { default } from '#build/${filename}.ts'\n`,
          "utf8",
        )
      }

      for (const filename of missingUiProseThemes) {
        const themePath = resolve(".nuxt", `${filename}.ts`)
        const proxyPath = resolve(".nuxt", filename)

        await mkdir(dirname(themePath), { recursive: true })
        await writeFile(themePath, "export default {}\n", "utf8")
        await writeFile(
          proxyPath,
          `export { default } from '#build/${filename}.ts'\n`,
          "utf8",
        )
      }
    },
  },

  supabase: {
    redirect: false,
  },
})
