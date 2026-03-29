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
      await supabase.from('profiles').upsert({
        user_id: data.user.id,
        role: 'cliente',
        is_active: true,
        contact_email: data.user.email ?? email.value.trim(),
        contact_phone: data.user.phone ?? null,
      })

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
  <AuthCardShell
    eyebrow="Crear cuenta"
    title="Registrate"
    description="Creá tu acceso para iniciar y dar seguimiento a tus trámites legales."
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
        autocomplete="new-password"
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

    <UAlert
      v-if="successMsg"
      color="success"
      variant="soft"
      title="Registro creado"
      :description="successMsg"
    />

    <div class="grid gap-3 justify-items-center">
      <UButton block size="lg" :loading="loading" @click="signUp">
        Crear cuenta
      </UButton>
    </div>

    <UDivider label="o" />

    <p class="text-center text-sm text-muted">
      ¿Ya tenés una cuenta?
      <NuxtLink to="/login" class="font-medium text-primary transition hover:underline">
        Iniciá sesión
      </NuxtLink>
    </p>
  </AuthCardShell>
</template>
