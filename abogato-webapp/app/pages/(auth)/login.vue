<script setup lang="ts">
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

    let profile: { role: 'cliente' | 'abogado' | 'admin', is_active: boolean } | null = null

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

    const role = profile?.role ?? 'cliente';

    if (role === 'abogado') {
      await navigateTo("/lawyer/dashboard", { replace: true });
      return;
    }

    if (role === 'admin') {
      await navigateTo("/admin/dashboard", { replace: true });
      return;
    }

    await navigateTo("/client/dashboard", { replace: true });
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
    title="Bienvenido"
    description="Iniciá sesión para continuar con tu seguimiento legal."
    content-width="sm"
    back-to="/"
    back-label="← Volver al inicio"
  >
    <template #headerAside>
      <UColorModeButton />
    </template>

    <UFormField label="Correo" name="email">
      <UInput
        v-model="email"
        type="email"
        placeholder="correo@ejemplo.com"
        autocomplete="email"
        size="lg"
      />
    </UFormField>

    <UFormField label="Contraseña" name="password">
      <UInput
        v-model="password"
        :type="mostrarPassword ? 'text' : 'password'"
        placeholder="••••••••"
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
    </UFormField>

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

    <p class="text-center text-sm text-muted">
      ¿Todavía no tenés cuenta?
      <NuxtLink to="/signup" class="font-medium text-primary transition hover:underline">
        Registrate acá
      </NuxtLink>
    </p>

    <div class="grid justify-items-center gap-3 text-center">
      <button
        class="text-sm text-muted transition hover:text-highlighted hover:underline"
        @click="mostrarRecuperacion = !mostrarRecuperacion"
      >
        ¿Olvidaste tu contraseña?
      </button>

      <div v-if="mostrarRecuperacion" class="app-subtle-panel app-panel-md grid w-full gap-3 p-4 text-left">
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
    </div>
  </AuthCardShell>
</template>
