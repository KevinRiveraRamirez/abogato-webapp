<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-10 auth-bg">
    <div class="w-full max-w-md">
      <slot />
    </div>
  </div>
</template>

<style scoped>
/* Fondo elegante y sutil (sin pelear con el modo oscuro) */
.auth-bg {
  background:
    radial-gradient(900px circle at 10% 10%, rgba(0, 220, 130, 0.16), transparent 55%),
    radial-gradient(800px circle at 90% 30%, rgba(59, 130, 246, 0.12), transparent 55%),
    radial-gradient(700px circle at 40% 90%, rgba(168, 85, 247, 0.10), transparent 55%);
}
</style>