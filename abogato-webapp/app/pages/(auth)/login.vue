<script setup lang="ts">
definePageMeta({ layout: "login-layout" });

const supabase = useSupabaseClient();
const user = useSupabaseUser();

const email = ref("");
const password = ref("");
const loading = ref(false);
const errorMsg = ref("");

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
      errorMsg.value = "Este correo ya está registrado. Inicia sesión.";
      return;
    }

    errorMsg.value =
      "Cuenta creada. Revisa tu correo para confirmar el registro.";
  } finally {
    loading.value = false;
  }
}

const { getMyProfile } = useMyProfile();

async function signIn() {
  errorMsg.value = "";
  loading.value = true;
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value.trim(),
      password: password.value,
    });

    if (error) {
      errorMsg.value = error.message;
      return;
    }

    // Asegura perfil (si no existe lo crea)
    await ensureProfile("cliente");

    // Lee rol real y redirige
    const profile = await getMyProfile();

    const role = profile?.role ?? "cliente";

    if (role === "abogado" || role === "lawyer") {
      await navigateTo("/lawyer/tickets", { replace: true });
      return;
    }

    await navigateTo("/tickets", { replace: true });
  } finally {
    loading.value = false;
  }
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
