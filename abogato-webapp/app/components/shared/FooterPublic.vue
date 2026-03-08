<template>
  <footer class="border-t border-gray-200 dark:border-gray-800 mt-16">
    <div class="max-w-6xl mx-auto px-4 py-12">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div class="md:col-span-1 space-y-3">
          <IconsLogo />
          <p class="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            Soluciones legales accesibles, rápidas y transparentes para personas y empresas.
          </p>
        </div>

        <div class="space-y-3">
          <h4 class="text-sm font-semibold text-gray-900 dark:text-white">Servicios</h4>
          <ul class="space-y-2 text-sm text-gray-500 dark:text-gray-400">
            <li><NuxtLink to="/servicios/servicios" class="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Traspaso de bienes</NuxtLink></li>
            <li><NuxtLink to="/servicios/servicios" class="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Trámites notariales</NuxtLink></li>
            <li><NuxtLink to="/servicios/servicios" class="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Asesoría jurídica</NuxtLink></li>
            <li><NuxtLink to="/servicios/servicios" class="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Derecho familiar</NuxtLink></li>
          </ul>
        </div>

        <div class="space-y-3">
          <h4 class="text-sm font-semibold text-gray-900 dark:text-white">Empresa</h4>
          <ul class="space-y-2 text-sm text-gray-500 dark:text-gray-400">
            <li><NuxtLink to="/about/about" class="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Sobre nosotros</NuxtLink></li>
            <li><NuxtLink to="/recurso/recursos" class="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Recursos legales</NuxtLink></li>
            <li><NuxtLink to="/contact/contact" class="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Contacto</NuxtLink></li>
          </ul>
        </div>

        <div class="space-y-3">
          <h4 class="text-sm font-semibold text-gray-900 dark:text-white">Cuenta</h4>
          <ul class="space-y-2 text-sm text-gray-500 dark:text-gray-400">
            <li><NuxtLink to="/login" class="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Iniciar sesión</NuxtLink></li>
            <li><NuxtLink to="/login" class="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Crear cuenta</NuxtLink></li>
            <li><NuxtLink to="/tickets" class="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Mis trámites</NuxtLink></li>
          </ul>
        </div>
      </div>

      <div class="mt-10 pt-6 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400 dark:text-gray-500">
        <p>© {{ new Date().getFullYear() }} Abogato. Todos los derechos reservados.</p>
        <p>Plataforma de gestión legal digital</p>
      </div>
    </div>
  </footer>
</template>
