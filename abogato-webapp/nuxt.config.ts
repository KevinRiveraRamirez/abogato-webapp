export default defineNuxtConfig({
  css: ["~/assets/css/main.css"],
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  ssr: false,

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