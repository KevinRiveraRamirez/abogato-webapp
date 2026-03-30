<script setup lang="ts">
import { getDashboardPathForRole } from '~/utils/app-navigation'
import type { AppRole } from '~~/shared/roles'

definePageMeta({ layout: "login-layout" });

const supabase = useSupabaseClient();
const route = useRoute();
const { start: startSessionLoading, finish: finishSessionLoading } = useSessionLoading()

const email = ref("");
const password = ref("");
const mostrarPassword = ref(false);
const loading = ref(false);
const errorMsg = ref("");

const mostrarRecuperacion = ref(false);
const emailRecuperacion = ref("");
const mensajeRecuperacion = ref("");

const testimonial = {
  quote: 'La plataforma nos ayudó a ordenar mejor el seguimiento de cada trámite.',
  author: 'Carlos R., usuario activo',
}
const blogPost = {
  title: 'Qué tener listo antes de iniciar un trámite digital',
  excerpt: 'Una guía rápida para entrar mejor preparado y aprovechar la plataforma desde el primer acceso.',
  to: '/blog/preparacion-tramite-digital',
}
const featurePreview = {
  title: 'Nueva funcionalidad próximamente',
  description: 'Seguimiento más visual del estado de tus trámites y recordatorios importantes desde tu panel principal.',
}

onMounted(() => {
  finishSessionLoading()

  if (route.query.inactive === '1') {
    errorMsg.value = 'Tu cuenta está desactivada. Contactá al administrador para reactivarla.'
  }
})

async function signIn() {
  errorMsg.value = "";
  let sessionTransitionStarted = false

  if (!email.value.trim()) { errorMsg.value = "El correo es obligatorio."; return; }
  if (!password.value) { errorMsg.value = "La contraseña es obligatoria."; return; }

  loading.value = true;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.value.trim(),
      password: password.value,
    });

    if (error) {
      errorMsg.value = "Credenciales incorrectas. Verificá tu correo y contraseña.";
      return;
    }

    const userId = data.user?.id;
    if (!userId) { errorMsg.value = "No se pudo obtener el usuario."; return; }

    startSessionLoading({
      title: 'Estamos preparando tu sesión',
      description: 'Validamos tu perfil y cargamos el panel inicial según tu rol dentro de la plataforma.',
    })
    sessionTransitionStarted = true

    let profile: { role: AppRole, is_active: boolean } | null = null

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('user_id', userId)
      .maybeSingle();

    profile = existingProfile as typeof profile

    if (!profile) {
      const { error: insertProfileError } = await supabase.from('profiles').insert([{
        user_id: userId,
        role: 'cliente',
        is_active: true,
        contact_email: data.user?.email ?? null,
        contact_phone: data.user?.phone ?? null
      }]);

      if (!insertProfileError) {
        profile = {
          role: 'cliente',
          is_active: true,
        }
      }
    }

    if (profile?.is_active === false) {
      await supabase.auth.signOut()
      finishSessionLoading()
      sessionTransitionStarted = false
      errorMsg.value = 'Tu cuenta está desactivada. Contactá al administrador para reactivarla.'
      return
    }

    await navigateTo(getDashboardPathForRole(profile?.role), { replace: true });
  } catch (error) {
    if (sessionTransitionStarted) {
      finishSessionLoading()
    }

    errorMsg.value = error instanceof Error ? error.message : 'No se pudo iniciar la sesión.'
  } finally {
    loading.value = false;
  }
}

async function enviarRecuperacion() {
  mensajeRecuperacion.value = "";
  errorMsg.value = "";

  const correo = emailRecuperacion.value.trim();
  if (!correo) { errorMsg.value = "Ingresá tu correo."; return; }

  loading.value = true;
  const { error } = await supabase.auth.resetPasswordForEmail(correo, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  loading.value = false;

  if (error) { errorMsg.value = error.message; return; }

  mensajeRecuperacion.value = "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.";
}
</script>

<template>
  <AuthCardShell
    eyebrow="Acceso a tu cuenta"
    title="Inicia sesión"
    description="Entrá a tu cuenta para consultar el estado de tus trámites, revisar documentos y continuar tu proceso legal."
    content-width="sm"
    back-to="/"
    back-label="← Volver al inicio"
  >
    <template #headerAside>
      <UColorModeButton />
    </template>

    <div class="grid gap-4">
      <div class="rounded-2xl border border-default/60 bg-default/40 p-4">
        <div class="flex items-start gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UIcon name="i-lucide-scale" class="h-5 w-5" />
          </div>
          <div class="space-y-1">
            <p class="text-sm font-semibold text-highlighted">Abogato</p>
            <p class="text-sm text-muted">Accedé a tu espacio para gestionar tu información y seguimiento.</p>
          </div>
        </div>
      </div>
    </div>

    <UFormField label="Correo electrónico" name="email">
      <UInput
        v-model="email"
        type="email"
        placeholder="correo@ejemplo.com"
        autocomplete="email"
        size="lg"
      />
    </UFormField>

    <div class="grid gap-2">
      <div class="flex items-center justify-between gap-3">
        <label class="text-sm font-medium text-default" for="login-password">Contraseña</label>
        <button
          class="text-xs text-primary transition hover:underline"
          type="button"
          @click="mostrarRecuperacion = !mostrarRecuperacion"
        >
          ¿Olvidaste tu contraseña?
        </button>
      </div>

      <UInput
        id="login-password"
        v-model="password"
        :type="mostrarPassword ? 'text' : 'password'"
        placeholder="Ingresa tu contraseña"
        autocomplete="current-password"
        size="lg"
      >
        <template #trailing>
          <button
            type="button"
            class="inline-flex items-center justify-center text-muted transition hover:text-highlighted"
            :aria-label="mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            :aria-pressed="mostrarPassword"
            @click="mostrarPassword = !mostrarPassword"
          >
            <UIcon :name="mostrarPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'" class="h-4 w-4" />
          </button>
        </template>
      </UInput>
    </div>

    <div v-if="mostrarRecuperacion" class="app-subtle-panel app-panel-md grid w-full gap-3 p-4 text-left">
      <p class="text-sm font-medium text-highlighted">Recuperar contraseña</p>
      <UInput
        v-model="emailRecuperacion"
        type="email"
        placeholder="Tu correo registrado"
      />
      <UButton variant="soft" :loading="loading" @click="enviarRecuperacion">
        Enviar enlace de recuperación
      </UButton>
      <p v-if="mensajeRecuperacion" class="text-xs text-success">
        {{ mensajeRecuperacion }}
      </p>
    </div>

    <UAlert
      v-if="errorMsg"
      color="warning"
      variant="soft"
      title="Atención"
      :description="errorMsg"
    />

    <div class="grid gap-3 justify-items-center">
      <UButton block size="lg" :loading="loading" @click="signIn">
        Iniciar sesión
      </UButton>
    </div>

    <UDivider label="o" />

        <div class="grid gap-4 rounded-2xl border border-default/60 bg-default/20 p-4">
      <div>
        <p class="text-sm font-semibold text-highlighted">Testimonio</p>
        <p class="mt-2 text-sm italic text-muted">“{{ testimonial.quote }}”</p>
        <p class="mt-2 text-xs text-muted">{{ testimonial.author }}</p>
      </div>

      <div class="border-t border-default/60 pt-4">
        <p class="text-sm font-semibold text-highlighted">Entrada recomendada</p>
        <p class="mt-2 text-sm font-medium">{{ blogPost.title }}</p>
        <p class="mt-1 text-sm text-muted">{{ blogPost.excerpt }}</p>
        <NuxtLink :to="blogPost.to" class="mt-2 inline-flex text-sm font-medium text-primary transition hover:underline">
          Leer más
        </NuxtLink>
      </div>

      <div class="border-t border-default/60 pt-4">
        <p class="text-sm font-semibold text-highlighted">Próximamente</p>
        <p class="mt-2 text-sm font-medium">{{ featurePreview.title }}</p>
        <p class="mt-1 text-sm text-muted">{{ featurePreview.description }}</p>
      </div>
    </div>

    <p class="text-center text-sm text-muted">
      ¿Todavía no tenés cuenta?
      <NuxtLink to="/signup" class="font-medium text-primary transition hover:underline">
        Registrate acá
      </NuxtLink>
    </p>


  </AuthCardShell>
</template>
