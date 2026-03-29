<template>
  <footer class="mt-16 border-t border-default/60 bg-default/70 backdrop-blur">
    <UContainer class="py-12">
      <div class="grid grid-cols-1 gap-8 md:grid-cols-4">
        <div class="space-y-3 md:col-span-1">
          <NuxtLink to="/" aria-label="Ir al inicio de Abogato" class="inline-flex">
            <IconsLogo />
          </NuxtLink>
          <p class="text-sm leading-relaxed text-muted">
            Soluciones legales accesibles, rápidas y transparentes para personas y empresas.
          </p>
        </div>

        <div class="space-y-3">
          <h4 class="text-sm font-semibold text-highlighted">Servicios</h4>
          <div class="grid gap-2 text-sm text-muted">
            <NuxtLink to="/servicios" class="hover:text-primary">Traspaso de bienes</NuxtLink>
            <NuxtLink to="/servicios" class="hover:text-primary">Trámites notariales</NuxtLink>
            <NuxtLink to="/servicios" class="hover:text-primary">Asesoría jurídica</NuxtLink>
            <NuxtLink to="/servicios" class="hover:text-primary">Derecho familiar</NuxtLink>
          </div>
        </div>

        <div class="space-y-3">
          <h4 class="text-sm font-semibold text-highlighted">Empresa</h4>
          <div class="grid gap-2 text-sm text-muted">
            <NuxtLink to="/about" class="hover:text-primary">Sobre nosotros</NuxtLink>
            <NuxtLink to="/recursos" class="hover:text-primary">Recursos legales</NuxtLink>
            <NuxtLink to="/contact" class="hover:text-primary">Contacto</NuxtLink>
          </div>
        </div>

        <div class="space-y-3">
          <h4 class="text-sm font-semibold text-highlighted">Cuenta</h4>
          <div class="grid gap-2 text-sm text-muted">
            <NuxtLink to="/login" class="hover:text-primary">Iniciar sesión</NuxtLink>
            <NuxtLink to="/signup" class="hover:text-primary">Crear cuenta</NuxtLink>
            <NuxtLink to="/tickets" class="hover:text-primary">Mis trámites</NuxtLink>
          </div>
        </div>
      </div>

      <USeparator class="my-8" />

      <div class="flex flex-col items-center justify-between gap-4 text-sm text-toned sm:flex-row">
        <p>© {{ new Date().getFullYear() }} Abogato. Todos los derechos reservados.</p>
        <p>Plataforma de gestión legal digital</p>
      </div>
    </UContainer>
  </footer>
</template>
