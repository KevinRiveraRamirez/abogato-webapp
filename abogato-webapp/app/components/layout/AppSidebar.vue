<script setup lang="ts">
import NotificationsNotificationBell from '~/components/notifications/NotificationBell.vue'
import { getFriendlyFirstName } from '~/utils/dashboard'
import {
  getDashboardPathForRole,
  getNavigationItems,
  getRoleLabel,
} from '~/utils/app-navigation'

const route = useRoute()
const { profile } = useUsuario()
const logout = useLogout()
const {
  collapsed,
  mobileOpen,
  toggleCollapsed,
  closeMobile,
} = useAppShell()

const loading = ref(false)

const items = computed(() => getNavigationItems(profile.value?.role))
const dashboardPath = computed(() => getDashboardPathForRole(profile.value?.role))
const roleLabel = computed(() => getRoleLabel(profile.value?.role))
const friendlyName = computed(() => getFriendlyFirstName(profile.value))

watch(
  () => route.fullPath,
  () => {
    closeMobile()
  }
)

async function signOut() {
  loading.value = true

  try {
    await logout()
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div
    class="sticky top-0 hidden h-screen shrink-0 self-start overflow-visible lg:block"
    :class="collapsed ? 'w-[6rem]' : 'w-[20rem]'"
  >
    <aside class="h-screen overflow-visible p-3">
      <div
        class="flex h-[calc(100vh-1.5rem)] flex-col rounded-[2rem] border border-default/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-3 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.32)] backdrop-blur-xl dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.98),rgba(15,23,42,0.96))]"
      >
        <div class="flex items-center" :class="collapsed ? 'justify-center' : 'justify-between gap-3 px-1 pb-3'">
          <NuxtLink :to="dashboardPath" class="flex min-w-0 items-center gap-3">
            <div class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950">
              <UIcon name="i-lucide-scale" class="size-5" />
            </div>

            <div v-if="!collapsed" class="min-w-0">
              <p class="truncate text-sm font-semibold text-highlighted">Abogato</p>
              <p class="text-xs text-muted">plataforma legal</p>
            </div>
          </NuxtLink>

          <UButton
            v-if="!collapsed"
            icon="i-lucide-panel-left-close"
            color="neutral"
            variant="ghost"
            square
            aria-label="Colapsar sidebar"
            @click="toggleCollapsed"
          />

          <UButton
            v-else
            icon="i-lucide-panel-left-open"
            color="neutral"
            variant="ghost"
            square
            aria-label="Expandir sidebar"
            @click="toggleCollapsed"
          />
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto">
          <UNavigationMenu
            :items="items"
            orientation="vertical"
            :collapsed="collapsed"
            tooltip
            highlight
            class="data-[orientation=vertical]:w-full"
            :ui="{
              root: 'w-full',
              list: collapsed ? 'space-y-2' : 'space-y-1.5',
              link: collapsed
                ? 'min-h-11 justify-center rounded-2xl px-0'
                : 'min-h-11 rounded-2xl px-3 text-sm font-medium',
              linkLeadingIcon: 'size-5',
              linkLabel: collapsed ? 'hidden' : 'truncate',
              linkTrailing: collapsed ? 'hidden' : 'ms-auto inline-flex items-center'
            }"
          />
        </div>

        <div
          v-if="!collapsed"
          class="mt-4 rounded-[1.6rem] border border-default/70 bg-elevated/40 px-4 py-4"
        >
          <p class="text-xs font-medium uppercase tracking-[0.18em] text-muted">Sesion activa</p>
          <p class="mt-2 text-sm font-semibold text-highlighted">{{ friendlyName }}</p>
          <p class="mt-1 text-xs text-muted">{{ roleLabel }}</p>
        </div>

        <div class="mt-4 grid gap-2" :class="collapsed ? 'justify-items-center' : ''">
          <div :class="collapsed ? '' : 'flex items-center gap-2'">
            <div class="relative z-[90]">
              <NotificationsNotificationBell />
            </div>

            <UColorModeButton
              color="neutral"
              variant="ghost"
              :square="collapsed"
              :class="collapsed ? '' : 'rounded-2xl'"
            />
          </div>

          <UButton
            icon="i-lucide-log-out"
            color="error"
            variant="soft"
            :label="collapsed ? undefined : 'Cerrar sesión'"
            :square="collapsed"
            :loading="loading"
            :disabled="loading"
            :class="collapsed ? '' : 'justify-start rounded-2xl px-3'"
            @click="signOut"
          />
        </div>
      </div>
    </aside>
  </div>

  <USlideover
    v-model:open="mobileOpen"
    side="left"
    :ui="{
      content: 'max-w-[19rem] border-r border-default/70 bg-transparent p-0 shadow-none'
    }"
  >
    <template #content>
      <aside class="h-full bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.98))] p-3 dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.99),rgba(15,23,42,0.98))]">
        <div class="flex h-full flex-col rounded-[2rem] border border-default/70 bg-default/95 p-3 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.32)]">
          <div class="flex items-center justify-between gap-3 px-1 pb-3">
            <NuxtLink :to="dashboardPath" class="flex min-w-0 items-center gap-3" @click="closeMobile">
              <div class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950">
                <UIcon name="i-lucide-scale" class="size-5" />
              </div>

              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-highlighted">Abogato</p>
                <p class="text-xs text-muted">plataforma legal</p>
              </div>
            </NuxtLink>

            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              square
              aria-label="Cerrar navegación"
              @click="closeMobile"
            />
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto">
            <UNavigationMenu
              :items="items"
              orientation="vertical"
              highlight
              class="data-[orientation=vertical]:w-full"
              :ui="{
                root: 'w-full',
                list: 'space-y-1.5',
                link: 'min-h-11 rounded-2xl px-3 text-sm font-medium',
                linkLeadingIcon: 'size-5'
              }"
            />
          </div>

          <div class="mt-4 rounded-[1.6rem] border border-default/70 bg-elevated/40 px-4 py-4">
            <p class="text-xs font-medium uppercase tracking-[0.18em] text-muted">Sesion activa</p>
            <p class="mt-2 text-sm font-semibold text-highlighted">{{ friendlyName }}</p>
            <p class="mt-1 text-xs text-muted">{{ roleLabel }}</p>
          </div>

          <div class="mt-4 grid gap-2">
            <div class="relative z-[90]">
              <NotificationsNotificationBell />
            </div>

            <UColorModeButton color="neutral" variant="ghost" class="justify-start rounded-2xl px-3" />
            <UButton
              icon="i-lucide-log-out"
              color="error"
              variant="soft"
              label="Cerrar sesión"
              :loading="loading"
              :disabled="loading"
              class="justify-start rounded-2xl px-3"
              @click="signOut"
            />
          </div>
        </div>
      </aside>
    </template>
  </USlideover>
</template>
