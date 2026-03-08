<script setup lang="ts">
definePageMeta({ layout: "login-layout" });

const supabase = useSupabaseClient();

const email = ref("");
const password = ref("");
const loading = ref(false);
const errorMsg = ref("");

const mostrarRecuperacion = ref(false);
const emailRecuperacion = ref("");
const mensajeRecuperacion = ref("");

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

    if (error) { errorMsg.value = error.message; return; }

    const identities = data.user?.identities ?? [];
    if (data.user && identities.length === 0) {
      errorMsg.value = "Este correo ya está registrado. Iniciá sesión.";
      return;
    }

    if (data.user?.id) {
      await supabase
        .from('profiles')
        .upsert([{ user_id: data.user.id, role: 'cliente' }], { onConflict: 'user_id' })

      await navigateTo("/tickets", { replace: true });
      return;
    }

    errorMsg.value = "Cuenta creada. Revisá tu correo para confirmar el registro.";
  } finally {
    loading.value = false;
  }
}

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
      await supabase.from('profiles').insert([{ user_id: userId, role: 'cliente' }]);
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
        title="Atención"
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

  <div class="text-center mt-4">
    <NuxtLink to="/" class="text-sm text-gray-500 hover:underline">
      ← Volver al inicio
    </NuxtLink>
  </div>
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
</style>
