<template>
  <div class="auth-layout min-h-screen px-4 py-10">
    <UContainer class="flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
      <div class="w-full max-w-md">
        <slot />
      </div>
    </UContainer>
  </div>
</template>

<style scoped>
.auth-layout {
  background:
    radial-gradient(900px circle at 10% 10%, rgba(0, 220, 130, 0.16), transparent 55%),
    radial-gradient(800px circle at 90% 30%, rgba(59, 130, 246, 0.12), transparent 55%),
    radial-gradient(700px circle at 40% 90%, rgba(168, 85, 247, 0.10), transparent 55%);
}
</style>
