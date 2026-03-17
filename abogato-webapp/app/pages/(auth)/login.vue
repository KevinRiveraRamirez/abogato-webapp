<script setup lang="ts">
definePageMeta({ layout: "login-layout" });


const supabase = useSupabaseClient();

const email = ref("");
const password = ref("");
const mostrarPassword = ref(false);
const loading = ref(false);
const errorMsg = ref("");

const mostrarRecuperacion = ref(false);
const emailRecuperacion = ref("");
const mensajeRecuperacion = ref("");

async function signIn() {
  errorMsg.value = "";

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

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (!profile) {
      await supabase.from('profiles').insert([{
        user_id: userId,
        role: 'cliente',
        contact_email: data.user?.email ?? null,
        contact_phone: data.user?.phone ?? null
      }]);
    }

    const role = profile?.role ?? 'cliente';

    if (role === 'abogado') {
      await navigateTo("/lawyer/tickets", { replace: true });
      return;
    }

    if (role === 'admin') {
      await navigateTo("/lawyer/tickets", { replace: true });
      return;
    }

    await navigateTo("/tickets", { replace: true });
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
  <div class="auth-shell">
    <UCard class="auth-card">
      <template #header>
        <div class="auth-header">
          <div class="space-y-2 text-center sm:text-left">
            <p class="auth-eyebrow">Acceso a tu cuenta</p>
            <h1 class="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
              Bienvenido
            </h1>
            <p class="text-sm leading-6 text-gray-500 dark:text-gray-400">
              Iniciá sesión para continuar con tu seguimiento legal.
            </p>
          </div>
          <div class="auth-mode">
            <UColorModeButton />
          </div>
        </div>
      </template>

      <div class="auth-body">
        <UFormGroup label="Correo" name="email">
          <UInput
            v-model="email"
            type="email"
            placeholder="correo@ejemplo.com"
            autocomplete="email"
            size="lg"
          />
        </UFormGroup>

        <UFormGroup label="Contraseña" name="password">
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
                class="password-toggle"
                :aria-label="mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                :aria-pressed="mostrarPassword"
                @click="mostrarPassword = !mostrarPassword"
              >
                <UIcon :name="mostrarPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'" class="h-4 w-4" />
              </button>
            </template>
          </UInput>
        </UFormGroup>

        <UAlert
          v-if="errorMsg"
          color="warning"
          variant="soft"
          title="Atención"
          :description="errorMsg"
        />

        <div class="auth-actions">
          <UButton block size="lg" :loading="loading" @click="signIn">
            Iniciar sesión
          </UButton>
        </div>

        <UDivider label="o" />

        <p class="text-sm text-center text-gray-500 dark:text-gray-400">
          ¿Todavía no tenés cuenta?
          <NuxtLink to="/signup" class="font-medium text-primary-600 hover:underline dark:text-primary-400">
            Registrate acá
          </NuxtLink>
        </p>

        <div class="auth-recovery">
          <button
            class="auth-recovery-toggle"
            @click="mostrarRecuperacion = !mostrarRecuperacion"
          >
            ¿Olvidaste tu contraseña?
          </button>

          <div v-if="mostrarRecuperacion" class="auth-recovery-panel">
            <UInput
              v-model="emailRecuperacion"
              type="email"
              placeholder="Tu correo registrado"
            />
            <UButton variant="soft" :loading="loading" @click="enviarRecuperacion">
              Enviar enlace de recuperación
            </UButton>
            <p v-if="mensajeRecuperacion" class="text-xs text-green-600 dark:text-green-400">
              {{ mensajeRecuperacion }}
            </p>
          </div>
        </div>
      </div>
    </UCard>

    <div class="auth-footer">
      <NuxtLink to="/" class="text-sm text-gray-500 transition hover:text-gray-700 hover:underline dark:hover:text-gray-300">
        ← Volver al inicio
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.auth-shell {
  display: grid;
  gap: 1rem;
}

.auth-card {
  width: 100%;
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
}

.auth-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.auth-eyebrow {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(22 163 74);
}

.auth-mode {
  display: flex;
  justify-content: flex-end;
}

.auth-body {
  display: grid;
  gap: 1.25rem;
}

.auth-actions {
  display: grid;
  gap: 0.75rem;
}

.auth-recovery {
  display: grid;
  justify-items: center;
  gap: 0.75rem;
  text-align: center;
}

.auth-recovery-toggle {
  font-size: 0.875rem;
  color: rgb(107 114 128);
  transition: color 0.2s ease, text-decoration-color 0.2s ease;
}

.auth-recovery-toggle:hover {
  color: rgb(31 41 55);
  text-decoration: underline;
}

.auth-recovery-panel {
  display: grid;
  width: 100%;
  gap: 0.75rem;
  border-radius: 1rem;
  padding: 1rem;
  text-align: left;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.auth-footer {
  text-align: center;
}

.password-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgb(107 114 128);
  transition: color 0.2s ease;
}

.password-toggle:hover {
  color: rgb(31 41 55);
}

.dark .auth-card {
  background: rgba(17, 17, 17, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
}

.dark .auth-eyebrow {
  color: rgb(74 222 128);
}

.dark .auth-recovery-toggle {
  color: rgb(156 163 175);
}

.dark .auth-recovery-toggle:hover {
  color: rgb(229 231 235);
}

.dark .auth-recovery-panel {
  background: rgba(17, 24, 39, 0.5);
  border-color: rgba(255, 255, 255, 0.08);
}

.dark .password-toggle {
  color: rgb(156 163 175);
}

.dark .password-toggle:hover {
  color: rgb(229 231 235);
}

@media (min-width: 640px) {
  .auth-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 639px) {
  .auth-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .auth-mode {
    width: 100%;
    justify-content: center;
  }
}
</style>
