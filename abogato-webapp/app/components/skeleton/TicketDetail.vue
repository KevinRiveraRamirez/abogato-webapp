<template>
  <div class="grid gap-6">
    <UCard>
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-3">
          <USkeleton class="h-8 w-72 max-w-full" />
          <div class="flex flex-wrap items-center gap-2">
            <USkeleton class="h-6 w-24 rounded-full" />
            <USkeleton class="h-6 w-28 rounded-full" />
          </div>
          <USkeleton class="h-3 w-40" />
        </div>

        <div class="flex flex-wrap gap-2">
          <USkeleton class="h-10 w-24 rounded-xl" />
          <USkeleton class="h-10 w-36 rounded-xl" />
        </div>
      </div>

      <USkeleton class="mt-5 h-16 w-full rounded-[1.5rem]" />
    </UCard>

    <UCard>
      <USkeleton class="h-4 w-full max-w-3xl" />
      <USkeleton class="mt-3 h-4 w-[82%]" />
    </UCard>

    <UCard>
      <template #header>
        <div class="space-y-2">
          <USkeleton class="h-5 w-36" />
          <USkeleton class="h-3 w-56" />
        </div>
      </template>

      <div class="grid gap-3">
        <div
          v-for="item in 2"
          :key="`document-${item}`"
          class="rounded-[1.4rem] border border-default/80 bg-default/90 p-4"
        >
          <div class="flex items-center justify-between gap-3">
            <USkeleton class="h-4 w-44" />
            <USkeleton class="h-6 w-20 rounded-full" />
          </div>
          <USkeleton class="mt-3 h-3 w-32" />
          <USkeleton class="mt-4 h-10 w-36 rounded-xl" />
        </div>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div class="space-y-2">
          <USkeleton class="h-5 w-40" />
          <USkeleton class="h-3 w-44" />
        </div>
      </template>

      <div class="grid gap-3">
        <div
          v-for="item in 2"
          :key="`attachment-${item}`"
          class="flex items-center justify-between gap-3 rounded-[1.2rem] border border-default/80 bg-default/90 px-4 py-3"
        >
          <USkeleton class="h-4 w-[60%]" />
          <USkeleton class="h-9 w-24 rounded-xl" />
        </div>
      </div>

      <div class="mt-4">
        <USkeleton class="h-10 w-36 rounded-xl" />
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div class="space-y-2">
          <USkeleton class="h-5 w-28" />
          <USkeleton class="h-3 w-64" />
        </div>
      </template>

      <div class="grid gap-3">
        <div
          v-for="item in 3"
          :key="`comment-${item}`"
          class="rounded-[1.4rem] border border-default/80 bg-default/90 p-4"
        >
          <USkeleton class="h-4 w-full" />
          <USkeleton class="mt-3 h-4 w-[85%]" />
          <div class="mt-4 flex flex-wrap items-center gap-2">
            <USkeleton class="h-5 w-16 rounded-full" />
            <USkeleton class="h-3 w-24" />
            <USkeleton class="h-3 w-28" />
          </div>
        </div>
      </div>

      <div class="mt-4 grid gap-3">
        <USkeleton class="h-24 w-full rounded-[1.5rem]" />
        <div class="flex items-center justify-between gap-3">
          <USkeleton class="h-5 w-40 rounded-full" />
          <USkeleton class="h-10 w-24 rounded-xl" />
        </div>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div class="space-y-2">
          <USkeleton class="h-5 w-24" />
          <USkeleton class="h-3 w-52" />
        </div>
      </template>

      <div class="grid gap-4 border-l-2 border-default pl-4">
        <div v-for="item in 4" :key="`history-${item}`" class="space-y-2">
          <USkeleton class="h-4 w-44" />
          <USkeleton class="h-4 w-[72%]" />
          <USkeleton class="h-3 w-28" />
        </div>
      </div>
    </UCard>
  </div>
</template>
