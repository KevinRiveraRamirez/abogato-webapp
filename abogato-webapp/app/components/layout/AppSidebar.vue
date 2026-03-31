<script setup lang="ts">
import NotificationsNotificationBell from "~/components/notifications/NotificationBell.vue";
import { getFriendlyFirstName } from "~/utils/dashboard";
import {
  getDashboardPathForRole,
  getNavigationSections,
  getRoleLabel,
} from "~/utils/app-navigation";

const route = useRoute();
const { profile } = useUsuario();
const logout = useLogout();
const { collapsed, mobileOpen, toggleCollapsed, closeMobile } = useAppShell();

const loading = ref(false);

const sections = computed(() => getNavigationSections(profile.value?.role));
const dashboardPath = computed(() =>
  getDashboardPathForRole(profile.value?.role),
);
const roleLabel = computed(() => getRoleLabel(profile.value?.role));
const friendlyName = computed(() => getFriendlyFirstName(profile.value));
const isAdmin = computed(() => profile.value?.role === "admin");

watch(
  () => route.fullPath,
  () => {
    closeMobile();
  },
);

async function signOut() {
  loading.value = true;

  try {
    await logout();
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div
    class="sticky top-0 hidden h-screen shrink-0 self-start overflow-visible lg:block"
    :class="collapsed ? 'w-24' : 'w-[20rem]'"
  >
    <aside
      class="h-screen overflow-visible p-3"
      aria-label="Navegación principal"
    >
      <AppSurface
        as="div"
        variant="floating"
        radius="xl"
        padding="none"
        class="flex h-[calc(100vh-1.5rem)] flex-col p-3"
      >
        <div
          class="pb-3"
          :class="
            collapsed
              ? 'flex flex-col items-center gap-2'
              : 'flex items-center justify-between gap-3 px-1'
          "
        >
          <NuxtLink :to="dashboardPath" class="flex min-w-0 items-center gap-3">
            <div
              class="app-brand-mark flex size-11 shrink-0 items-center justify-center rounded-2xl"
            >
              <UIcon name="i-lucide-scale" class="size-5" />
            </div>

            <div v-if="!collapsed" class="min-w-0">
              <p class="truncate text-sm font-semibold text-highlighted">
                Abogato
              </p>
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

        <div class="scrollbar-none min-h-0 flex-1 overflow-y-auto">
          <nav class="space-y-4" aria-label="Secciones del panel">
            <section
              v-for="(section, index) in sections"
              :key="section.id"
              class="space-y-2"
            >
              <div
                v-if="index > 0"
                class="mx-auto h-px bg-default/70"
                :class="collapsed ? 'w-8' : 'w-full'"
              />

              <div v-if="!collapsed" class="px-3 pt-1">
                <p
                  class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted"
                >
                  {{ section.label }}
                </p>
              </div>

              <UNavigationMenu
                :items="section.items"
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
                  linkTrailing: collapsed
                    ? 'hidden'
                    : 'ms-auto inline-flex items-center',
                }"
              />
            </section>
          </nav>
        </div>

        <div
          v-if="!collapsed"
          class="app-subtle-panel app-panel-lg mt-4 px-4 py-4"
        >
          <p class="text-xs font-medium uppercase tracking-[0.18em] text-muted">
            Sesion activa
          </p>
          <p class="mt-2 text-sm font-semibold text-highlighted">
            {{ friendlyName }}
          </p>
          <p class="mt-1 text-xs text-muted">{{ roleLabel }}</p>
        </div>

        <div
          class="mt-4 grid gap-2"
          :class="collapsed ? 'justify-items-center' : ''"
        >
          <div :class="collapsed ? 'grid gap-2' : 'flex items-center gap-2'">
            <UTooltip text="Notificaciones" :disabled="!collapsed">
              <div class="relative z-90">
                <NotificationsNotificationBell panel-placement="right-end" />
              </div>
            </UTooltip>

            <UTooltip text="Cambiar tema" :disabled="!collapsed">
              <UColorModeButton
                color="neutral"
                :variant="collapsed ? 'outline' : 'ghost'"
                :square="collapsed"
                class="rounded-2xl border-default/80 bg-default/90 shadow-sm"
              />
            </UTooltip>
          </div>

          <UTooltip text="Cerrar sesión" :disabled="!collapsed">
            <UButton
              icon="i-lucide-log-out"
              color="error"
              :variant="collapsed ? 'outline' : 'soft'"
              :label="collapsed ? undefined : 'Cerrar sesión'"
              :square="collapsed"
              :loading="loading"
              :disabled="loading"
              class="rounded-2xl border-default/80"
              :class="collapsed ? 'h-11 w-11' : 'justify-start px-3'"
              @click="signOut"
            />
          </UTooltip>
        </div>
      </AppSurface>
    </aside>
  </div>

  <USlideover
    v-model:open="mobileOpen"
    side="left"
    :ui="{
      content:
        'max-w-19rem border-r border-default/70 bg-transparent p-0 shadow-none',
    }"
  >
    <template #content>
      <aside
        class="h-full p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        aria-label="Navegación móvil"
      >
        <AppSurface
          as="div"
          variant="floating"
          radius="xl"
          padding="none"
          class="flex h-full flex-col p-3"
        >
          <div class="flex items-center justify-between gap-3 px-1 pb-3">
            <NuxtLink
              :to="dashboardPath"
              class="flex min-w-0 items-center gap-3"
              @click="closeMobile"
            >
              <div
                class="app-brand-mark flex size-11 shrink-0 items-center justify-center rounded-2xl"
              >
                <UIcon name="i-lucide-scale" class="size-5" />
              </div>

              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-highlighted">
                  Abogato
                </p>
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

          <div class="scrollbar-none min-h-0 flex-1 overflow-y-auto">
            <nav class="space-y-4" aria-label="Secciones del panel">
              <section
                v-for="(section, index) in sections"
                :key="section.id"
                class="space-y-2"
              >
                <div v-if="index > 0" class="h-px w-full bg-default/70" />

                <div class="px-3 pt-1">
                  <p
                    class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted"
                  >
                    {{ section.label }}
                  </p>
                </div>

                <UNavigationMenu
                  :items="section.items"
                  orientation="vertical"
                  highlight
                  class="data-[orientation=vertical]:w-full"
                  :ui="{
                    root: 'w-full',
                    list: 'space-y-1.5',
                    link: 'min-h-11 rounded-2xl px-3 text-sm font-medium',
                    linkLeadingIcon: 'size-5',
                  }"
                />
              </section>
            </nav>
          </div>

          <div class="app-subtle-panel app-panel-lg mt-4 px-4 py-4">
            <p
              class="text-xs font-medium uppercase tracking-[0.18em] text-muted"
            >
              Sesion activa
            </p>
            <p class="mt-2 text-sm font-semibold text-highlighted">
              {{ friendlyName }}
            </p>
            <p class="mt-1 text-xs text-muted">{{ roleLabel }}</p>
          </div>

          <div class="mt-4 grid gap-2">
            <div class="relative z-90">
              <NotificationsNotificationBell panel-placement="top-start" />
            </div>

            <UColorModeButton
              color="neutral"
              variant="ghost"
              class="justify-start rounded-2xl px-3"
            />
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
        </AppSurface>
      </aside>
    </template>
  </USlideover>
</template>
