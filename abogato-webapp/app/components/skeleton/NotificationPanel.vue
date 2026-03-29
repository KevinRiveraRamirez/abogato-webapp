<template>
  <UCard
    class="app-floating-panel app-panel-xl flex w-[clamp(20rem,30vw,28rem)] max-h-[calc(100vh-1.5rem)] max-w-[calc(100vw-1.5rem)] flex-col sm:max-h-[calc(100vh-2rem)] sm:max-w-[calc(100vw-2rem)]"
    :ui="{
      header: 'shrink-0 px-4 pb-4 pt-4 sm:px-5 sm:pt-5',
      body: 'flex min-h-0 flex-1 flex-col px-4 pb-0 pt-0 sm:px-5',
      footer: 'shrink-0 px-4 pb-4 pt-4 sm:px-5 sm:pb-5'
    }"
  >
    <template #header>
      <div class="space-y-4">
        <div class="flex items-start justify-between gap-3">
          <div class="space-y-2">
            <USkeleton class="h-6 w-40" />
            <USkeleton class="h-4 w-28" />
          </div>

          <USkeleton class="size-8 rounded-lg" />
        </div>

        <div class="app-subtle-panel app-panel-sm p-1">
          <div class="grid grid-cols-3 gap-1">
            <USkeleton
              v-for="item in 3"
              :key="item"
              class="h-10 w-full rounded-[1rem]"
            />
          </div>
        </div>
      </div>
    </template>

    <div class="flex min-h-[12rem] flex-1 flex-col gap-3 py-1">
      <div
        v-for="item in 4"
        :key="item"
        class="rounded-[1.4rem] border border-default/70 bg-default/80 p-4"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1 space-y-2">
            <USkeleton class="h-4 w-[78%]" />
            <USkeleton class="h-3 w-full" />
            <USkeleton class="h-3 w-[72%]" />
          </div>

          <USkeleton class="size-10 rounded-xl" />
        </div>

        <div class="mt-4 flex items-center justify-between gap-3">
          <USkeleton class="h-3 w-20" />
          <USkeleton class="h-3 w-24" />
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex flex-col gap-3 border-t border-default/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <USkeleton class="h-4 w-36" />
        <USkeleton class="h-10 w-28 rounded-xl" />
      </div>
    </template>
  </UCard>
</template>
