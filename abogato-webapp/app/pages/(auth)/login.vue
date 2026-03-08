<script setup lang="ts">
definePageMeta({ layout: "login-layout" });

const supabase = useSupabaseClient();
const user = useSupabaseUser();

const email = ref("");
const password = ref("");
const loading = ref(false);
const errorMsg = ref("");

const mostrarRecuperacion = ref(false);
const emailRecuperacion = ref("");
const mensajeRecuperacion = ref("");

const ensureProfile = useEnsureProfile();

watch(
  () => user.value,
  async (u) => {
    if (u) {
      await ensureProfile("cliente");
    }
  },
  { immediate: true },
);

async function signUp() {
  errorMsg.value = "";

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

    errorMsg.value = "Cuenta creada. Revisá tu correo para confirmar el registro.";
  } finally {
    loading.value = false;
  }
}

const { getMyProfile } = useMyProfile();

async function signIn() {
  errorMsg.value = "";

  if (!email.value.trim()) { errorMsg.value = "El correo es obligatorio."; return; }
  if (!password.value) { errorMsg.value = "La contraseña es obligatoria."; return; }

  loading.value = true;
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value.trim(),
      password: password.value,
    });

    if (error) {
      errorMsg.value = "Credenciales incorrectas. Verificá tu correo y contraseña.";
      return;
    }

    await ensureProfile("cliente");

    const profile = await getMyProfile();
    const role = profile?.role ?? "cliente";

    if (role === "abogado") {
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

  if (error) {
    errorMsg.value = error.message;
    return;
  }

  mensajeRecuperacion.value = "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.";
}

async function signOut() {
  loading.value = true;
  try {
    await supabase.auth.signOut();
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UCard class="auth-card">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="space-y-1">
          <h1 class="text-xl font-semibold">Bienvenido</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Inicia sesión para continuar.
          </p>
        </div>

        <UColorModeButton />
      </div>
    </template>

    <div class="space-y-4">
      <UAlert
        v-if="user"
        color="primary"
        variant="soft"
        title="Sesión activa"
        :description="user.email"
      />

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
          type="password"
          placeholder="••••••••"
          autocomplete="current-password"
          size="lg"
        />
      </UFormGroup>

      <UAlert
        v-if="errorMsg"
        color="warning"
        variant="soft"
        title="No se pudo iniciar sesión"
        :description="errorMsg"
      />

      <div class="flex gap-2">
        <UButton block size="lg" :loading="loading" @click="signIn">
          Iniciar sesión
        </UButton>

        <UButton
          block
          size="lg"
          variant="soft"
          :loading="loading"
          @click="signUp"
        >
          Crear cuenta
        </UButton>
      </div>

      <UButton
        v-if="user"
        color="warning"
        variant="soft"
        size="lg"
        block
        :loading="loading"
        @click="signOut"
      >
        Cerrar sesión
      </UButton>

      <UDivider />

      <div class="grid gap-2 text-sm">
        <button
          class="text-sm text-gray-500 hover:underline text-left"
          @click="mostrarRecuperacion = !mostrarRecuperacion"
        >
          ¿Olvidaste tu contraseña?
        </button>

        <div v-if="mostrarRecuperacion" class="grid gap-2 mt-1">
          <UInput
            v-model="emailRecuperacion"
            type="email"
            placeholder="Tu correo registrado"
          />
          <UButton variant="soft" :loading="loading" @click="enviarRecuperacion">
            Enviar enlace de recuperación
          </UButton>
          <p v-if="mensajeRecuperacion" class="text-green-600 text-xs">
            {{ mensajeRecuperacion }}
          </p>
        </div>
      </div>
    </div>
  </UCard>
</template>

<style scoped>
.auth-card {
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(0, 0, 0, 0.06);
}
.dark .auth-card {
  background: rgba(17, 17, 17, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.link {
  opacity: 0.85;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.link:hover {
  opacity: 1;
  transform: translateY(-1px);
}
</style>
