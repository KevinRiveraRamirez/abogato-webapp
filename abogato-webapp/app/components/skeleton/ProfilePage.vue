<template>
  <div class="space-y-8">
    <div class="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <UCard class="border-primary/10 bg-default/90 shadow-[0_30px_60px_-32px_rgba(15,23,42,0.18)] dark:bg-elevated/80 dark:shadow-[0_30px_60px_-32px_rgba(2,6,23,0.65)]">
        <div class="space-y-6">
          <div class="flex items-start gap-4">
            <USkeleton class="size-20 rounded-[2rem]" />

            <div class="min-w-0 flex-1 space-y-3">
              <USkeleton class="h-6 w-24 rounded-full" />
              <USkeleton class="h-8 w-44 max-w-full" />
              <USkeleton class="h-4 w-full max-w-xs" />
            </div>
          </div>

          <USkeleton class="h-4 w-full" />
          <USkeleton class="h-4 w-[88%]" />

          <div class="rounded-[1.75rem] border border-default/70 bg-elevated/80 p-5">
            <div class="flex items-center justify-between gap-3">
              <div class="space-y-2">
                <USkeleton class="h-3 w-28" />
                <USkeleton class="h-8 w-20" />
              </div>
              <USkeleton class="h-8 w-24 rounded-full" />
            </div>

            <USkeleton class="mt-4 h-2 w-full rounded-full" />
            <USkeleton class="mt-4 h-4 w-full" />
            <USkeleton class="mt-2 h-4 w-[82%]" />
          </div>

          <div class="flex flex-wrap gap-3">
            <USkeleton class="h-10 w-40 rounded-xl" />
            <USkeleton class="h-10 w-44 rounded-full" />
          </div>
        </div>
      </UCard>

      <UCard class="border-primary/10 bg-default/90 shadow-[0_30px_60px_-32px_rgba(15,23,42,0.16)] dark:bg-elevated/80 dark:shadow-[0_30px_60px_-32px_rgba(2,6,23,0.55)]">
        <div class="space-y-6">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="space-y-2">
              <USkeleton class="h-4 w-24" />
              <USkeleton class="h-6 w-40" />
              <USkeleton class="h-4 w-64" />
            </div>

            <USkeleton class="h-10 w-32 rounded-xl" />
          </div>

          <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div
              v-for="item in 6"
              :key="`highlight-${item}`"
              class="rounded-[1.6rem] border border-default/80 bg-elevated/70 p-4"
            >
              <div class="flex items-start gap-3">
                <USkeleton class="size-11 rounded-xl" />
                <div class="min-w-0 flex-1 space-y-2">
                  <USkeleton class="h-3 w-24" />
                  <USkeleton class="h-5 w-full max-w-40" />
                  <USkeleton class="h-4 w-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <div
        v-for="item in 3"
        :key="`stat-${item}`"
        class="rounded-[1.75rem] border border-default/80 bg-default/85 p-5 shadow-sm"
      >
        <div class="flex items-start gap-3">
          <USkeleton class="size-11 rounded-xl" />
          <div class="min-w-0 flex-1 space-y-2">
            <USkeleton class="h-3 w-24" />
            <USkeleton class="h-6 w-16" />
            <USkeleton class="h-4 w-full" />
          </div>
        </div>
      </div>
    </div>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
      <UCard class="border-primary/10 bg-default/90 shadow-[0_30px_60px_-32px_rgba(15,23,42,0.16)] dark:bg-elevated/80 dark:shadow-[0_30px_60px_-32px_rgba(2,6,23,0.55)]">
        <div class="space-y-6">
          <div class="space-y-2">
            <USkeleton class="h-4 w-24" />
            <USkeleton class="h-6 w-56" />
            <USkeleton class="h-4 w-[70%]" />
          </div>

          <USkeleton class="h-20 w-full rounded-[1.5rem]" />
          <USkeleton class="h-20 w-full rounded-[1.5rem]" />

          <div class="grid gap-4 sm:grid-cols-2">
            <USkeleton class="h-20 w-full rounded-[1.4rem]" />
            <USkeleton class="h-20 w-full rounded-[1.4rem]" />
          </div>

          <USkeleton class="h-px w-full" />

          <div class="grid gap-4 lg:grid-cols-2">
            <USkeleton class="h-36 w-full rounded-[1.4rem]" />
            <USkeleton class="h-36 w-full rounded-[1.4rem]" />
          </div>

          <div class="flex flex-wrap gap-3">
            <USkeleton class="h-11 w-36 rounded-xl" />
            <USkeleton class="h-11 w-32 rounded-xl" />
          </div>
        </div>
      </UCard>

      <div class="grid gap-6">
        <UCard class="border-default/80 bg-default/85 shadow-sm backdrop-blur-sm dark:bg-elevated/70">
          <div class="space-y-4">
            <div class="space-y-2">
              <USkeleton class="h-4 w-20" />
              <USkeleton class="h-6 w-44" />
            </div>

            <div class="space-y-3">
              <div
                v-for="item in 5"
                :key="`check-${item}`"
                class="flex items-start gap-3 rounded-[1.4rem] border border-default/80 bg-elevated/40 p-4"
              >
                <USkeleton class="mt-0.5 size-9 rounded-full" />
                <div class="min-w-0 flex-1 space-y-2">
                  <USkeleton class="h-4 w-36" />
                  <USkeleton class="h-4 w-full" />
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>
