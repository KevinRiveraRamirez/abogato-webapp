<script setup lang="ts">
const { active, title, description } = useSessionLoading()
</script>

<template>
  <Transition
    enter-active-class="transition duration-250 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="active"
      class="fixed inset-0 z-[200] overflow-y-auto px-4 py-8 backdrop-blur-sm app-auth-layout"
    >
      <div class="mx-auto flex min-h-full w-full max-w-6xl items-center">
        <UCard class="app-floating-panel app-panel-xl w-full overflow-hidden">
          <div class="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <div class="space-y-6">
              <div class="inline-flex size-14 items-center justify-center rounded-[1.4rem] bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950">
                <UIcon name="i-lucide-scale" class="size-6" />
              </div>

              <div class="space-y-3">
                <p class="text-sm font-medium uppercase tracking-[0.22em] text-primary/80">
                  Abogato
                </p>
                <h2 class="text-3xl font-semibold tracking-tight text-highlighted sm:text-4xl">
                  {{ title }}
                </h2>
                <p class="max-w-xl text-sm leading-7 text-muted sm:text-base">
                  {{ description }}
                </p>
              </div>

              <div class="grid gap-3 sm:grid-cols-3">
                <div
                  v-for="item in 3"
                  :key="item"
                  class="rounded-[1.4rem] border border-default/70 bg-elevated/50 p-4"
                >
                  <USkeleton class="h-3 w-20" />
                  <USkeleton class="mt-3 h-8 w-16" />
                  <USkeleton class="mt-3 h-3 w-full" />
                </div>
              </div>
            </div>

            <div class="grid gap-4">
              <div class="rounded-[1.8rem] border border-default/70 bg-elevated/45 p-5">
                <div class="flex items-start justify-between gap-4">
                  <div class="space-y-3">
                    <USkeleton class="h-4 w-24" />
                    <USkeleton class="h-8 w-48 max-w-full" />
                    <USkeleton class="h-4 w-full max-w-md" />
                  </div>
                  <USkeleton class="h-11 w-24 rounded-2xl" />
                </div>

                <div class="mt-8 grid gap-4 md:grid-cols-3">
                  <div
                    v-for="item in 3"
                    :key="`metric-${item}`"
                    class="rounded-[1.4rem] border border-default/70 bg-default/85 p-4"
                  >
                    <USkeleton class="h-3 w-24" />
                    <USkeleton class="mt-3 h-7 w-20" />
                    <USkeleton class="mt-3 h-3 w-full" />
                  </div>
                </div>
              </div>

              <div class="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                <div class="rounded-[1.8rem] border border-default/70 bg-default/85 p-5">
                  <USkeleton class="h-4 w-32" />
                  <div class="mt-5 space-y-4">
                    <div
                      v-for="item in 4"
                      :key="`row-${item}`"
                      class="rounded-[1.2rem] border border-default/70 bg-elevated/45 p-4"
                    >
                      <div class="flex items-center justify-between gap-3">
                        <div class="space-y-2">
                          <USkeleton class="h-4 w-28" />
                          <USkeleton class="h-3 w-36" />
                        </div>
                        <USkeleton class="h-5 w-14" />
                      </div>
                      <USkeleton class="mt-4 h-2 w-full rounded-full" />
                    </div>
                  </div>
                </div>

                <div class="rounded-[1.8rem] border border-default/70 bg-default/85 p-5">
                  <USkeleton class="h-4 w-28" />
                  <div class="mt-5 space-y-3">
                    <div
                      v-for="item in 5"
                      :key="`side-${item}`"
                      class="flex items-center justify-between rounded-[1.2rem] border border-default/70 bg-elevated/45 px-4 py-3"
                    >
                      <USkeleton class="h-4 w-28" />
                      <USkeleton class="h-5 w-12" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </Transition>
</template>
