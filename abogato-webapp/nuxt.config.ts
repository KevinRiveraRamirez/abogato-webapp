export default defineNuxtConfig({
  css: ["~/assets/css/main.css"],
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  ssr: false,
  runtimeConfig: {
    padronImportSecret: process.env.PADRON_IMPORT_SECRET,
    padronTsePageUrl: process.env.PADRON_TSE_PAGE_URL ?? "https://www.tse.go.cr/descarga_padron.html",
    padronTseZipUrl: process.env.PADRON_TSE_ZIP_URL ?? "",
    supabaseUrl: process.env.SUPABASE_URL ?? process.env.NUXT_PUBLIC_SUPABASE_URL,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY ?? "",
  },

  modules: [
    "@nuxt/eslint",
    "@nuxt/image",
    "@nuxt/ui",
    "@nuxtjs/supabase",
  ],

  supabase: {
    redirect: false,
  },
})
