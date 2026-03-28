<template>
  <div class="mx-auto w-full max-w-7xl space-y-8">
    <section class="overflow-hidden rounded-[2rem] border border-default/70 bg-default/85 p-8 shadow-sm">
      <div class="flex flex-wrap items-start justify-between gap-6">
        <div class="max-w-3xl space-y-3">
          <USkeleton class="h-4 w-20" />
          <USkeleton class="h-10 w-[22rem] max-w-full" />
          <USkeleton class="h-4 w-full max-w-2xl" />
          <USkeleton class="h-4 w-[82%] max-w-xl" />
        </div>

        <div class="flex flex-wrap gap-3">
          <USkeleton class="h-11 w-32 rounded-2xl" />
          <USkeleton class="h-11 w-32 rounded-2xl" />
          <USkeleton class="h-11 w-28 rounded-2xl" />
        </div>
      </div>

      <div class="mt-8 grid gap-4 md:grid-cols-3">
        <div
          v-for="item in 3"
          :key="`hero-${item}`"
          class="rounded-[1.5rem] border border-default/70 bg-elevated/45 p-4"
        >
          <USkeleton class="h-3 w-24" />
          <USkeleton class="mt-4 h-8 w-20" />
          <USkeleton class="mt-3 h-3 w-full" />
        </div>
      </div>
    </section>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <UCard
        v-for="item in 4"
        :key="`metric-${item}`"
        class="border border-default/80 bg-default/90 shadow-sm"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <USkeleton class="h-3 w-24" />
            <USkeleton class="mt-4 h-9 w-20" />
          </div>
          <USkeleton class="size-11 rounded-2xl" />
        </div>
        <USkeleton class="mt-4 h-3 w-full" />
      </UCard>
    </div>

    <div class="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <UCard>
        <template #header>
          <div class="space-y-2">
            <USkeleton class="h-5 w-40" />
            <USkeleton class="h-3 w-56" />
          </div>
        </template>

        <div class="grid gap-4">
          <div
            v-for="item in 4"
            :key="`distribution-${item}`"
            class="rounded-[1.5rem] border border-default/80 bg-elevated/50 p-4"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="space-y-2">
                <USkeleton class="h-4 w-28" />
                <USkeleton class="h-3 w-20" />
              </div>
              <USkeleton class="h-5 w-12" />
            </div>
            <USkeleton class="mt-4 h-2 w-full rounded-full" />
          </div>
        </div>
      </UCard>

      <div class="grid gap-6">
        <UCard>
          <template #header>
            <div class="space-y-2">
              <USkeleton class="h-5 w-28" />
              <USkeleton class="h-3 w-48" />
            </div>
          </template>

          <div class="grid gap-3">
            <div
              v-for="item in 4"
              :key="`status-${item}`"
              class="flex items-center justify-between rounded-2xl border border-default/80 bg-elevated/50 px-4 py-3"
            >
              <USkeleton class="h-4 w-28" />
              <USkeleton class="h-5 w-12" />
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="space-y-2">
              <USkeleton class="h-5 w-36" />
              <USkeleton class="h-3 w-44" />
            </div>
          </template>

          <div class="grid gap-3">
            <div
              v-for="item in 4"
              :key="`role-${item}`"
              class="flex items-center justify-between rounded-2xl border border-default/80 bg-elevated/50 px-4 py-3"
            >
              <USkeleton class="h-4 w-24" />
              <USkeleton class="h-5 w-10" />
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <div class="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div class="space-y-2">
              <USkeleton class="h-5 w-36" />
              <USkeleton class="h-3 w-52" />
            </div>
            <USkeleton class="h-10 w-28 rounded-xl" />
          </div>
        </template>

        <div class="grid gap-3">
          <div
            v-for="item in 3"
            :key="`ticket-${item}`"
            class="rounded-[1.5rem] border border-default/80 bg-default/90 p-4"
          >
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <USkeleton class="h-6 w-20 rounded-full" />
                  <USkeleton class="h-6 w-16 rounded-full" />
                </div>
                <USkeleton class="mt-4 h-5 w-full max-w-lg" />
                <div class="mt-3 grid gap-2 sm:grid-cols-2">
                  <USkeleton class="h-3 w-full" />
                  <USkeleton class="h-3 w-full" />
                  <USkeleton class="h-3 w-32" />
                </div>
              </div>

              <USkeleton class="h-10 w-24 rounded-xl" />
            </div>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div class="space-y-2">
            <USkeleton class="h-5 w-36" />
            <USkeleton class="h-3 w-52" />
          </div>
        </template>

        <div class="grid gap-3">
          <div
            v-for="item in 4"
            :key="`activity-${item}`"
            class="rounded-[1.5rem] border border-default/80 bg-default/90 p-4"
          >
            <USkeleton class="h-4 w-[70%]" />
            <USkeleton class="mt-3 h-3 w-[45%]" />
            <div class="mt-4 flex items-center justify-between gap-3">
              <USkeleton class="h-3 w-20" />
              <USkeleton class="h-3 w-24" />
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
