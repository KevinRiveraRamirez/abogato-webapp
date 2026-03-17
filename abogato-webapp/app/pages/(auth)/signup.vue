<script setup lang="ts">
definePageMeta({ layout: "login-layout" });

const supabase = useSupabaseClient();

const email = ref("");
const password = ref("");
const mostrarPassword = ref(false);
const loading = ref(false);
const errorMsg = ref("");
const successMsg = ref("");

async function signUp() {
  errorMsg.value = "";
  successMsg.value = "";

  if (!email.value.trim()) { errorMsg.value = "El correo es obligatorio."; return; }
  if (!password.value) { errorMsg.value = "La contraseña es obligatoria."; return; }
  if (password.value.length < 8) { errorMsg.value = "La contraseña debe tener al menos 8 caracteres."; return; }
  if (!/[A-Z]/.test(password.value)) { errorMsg.value = "La contraseña debe incluir al menos una mayúscula."; return; }
  if (!/[0-9]/.test(password.value)) { errorMsg.value = "La contraseña debe incluir al menos un número."; return; }

  loading.value = true;
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.value.trim(),
      password: password.value,
    });

    if (error) {
      errorMsg.value = error.message;
      return;
    }

    const identities = data.user?.identities ?? [];
    if (data.user && identities.length === 0) {
      errorMsg.value = "Este correo ya está registrado. Iniciá sesión.";
      return;
    }

    if (data.user?.id) {
      await navigateTo("/tickets", { replace: true });
      return;
    }

    successMsg.value = "Cuenta creada. Revisá tu correo para confirmar el registro.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="auth-shell">
    <UCard class="auth-card">
      <template #header>
        <div class="auth-header">
          <div class="space-y-2 text-center sm:text-left">
            <p class="auth-eyebrow">Crear cuenta</p>
            <h1 class="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
              Registrate
            </h1>
            <p class="text-sm leading-6 text-gray-500 dark:text-gray-400">
              Creá tu acceso para iniciar y dar seguimiento a tus trámites legales.
            </p>
          </div>
          <div class="auth-mode">
            <UColorModeButton />
          </div>
        </div>
      </template>

      <div class="auth-body">
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
            autocomplete="new-password"
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
        </UFormField>

        <UAlert
          v-if="errorMsg"
          color="warning"
          variant="soft"
          title="Atención"
          :description="errorMsg"
        />

        <UAlert
          v-if="successMsg"
          color="success"
          variant="soft"
          title="Registro creado"
          :description="successMsg"
        />

        <div class="auth-actions">
          <UButton block size="lg" :loading="loading" @click="signUp">
            Crear cuenta
          </UButton>
        </div>

        <UDivider label="o" />

        <p class="text-sm text-center text-gray-500 dark:text-gray-400">
          ¿Ya tenés una cuenta?
          <NuxtLink to="/login" class="font-medium text-primary-600 hover:underline dark:text-primary-400">
            Iniciá sesión
          </NuxtLink>
        </p>
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

.dark .password-toggle {
  color: rgb(156 163 175);
}

.dark .password-toggle:hover {
  color: rgb(229 231 235);
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
