<script setup lang="ts">
definePageMeta({ layout: "login-layout" });

const supabase = useSupabaseClient();

const email = ref("");
const password = ref("");
const mostrarPassword = ref(false);
const loading = ref(false);
const errorMsg = ref("");
const successMsg = ref("");

const customersCount = '1,200+';
const testimonial = {
  quote: 'Abogato nos permitió iniciar trámites con más claridad y mucho menos tiempo de espera.',
  author: 'María G., clienta',
};
const blogPost = {
  title: 'Guía básica para iniciar un trámite legal sin perder documentos importantes',
  excerpt: 'Conocé qué información necesitás preparar antes de crear tu cuenta y empezar tu proceso.',
  to: '/blog/guia-inicio-tramites',
};

const passwordChecks = computed(() => ({
  minLength: password.value.length >= 8,
  upper: /[A-Z]/.test(password.value),
  number: /[0-9]/.test(password.value),
  special: /[^A-Za-z0-9]/.test(password.value),
}));

const passwordStrength = computed(() => {
  const checks = Object.values(passwordChecks.value).filter(Boolean).length;

  if (!password.value) {
    return { label: 'Sin definir', value: 0, color: 'neutral' as const };
  }

  if (checks <= 1) {
    return { label: 'Débil', value: 25, color: 'error' as const };
  }

  if (checks === 2 || checks === 3) {
    return { label: 'Media', value: 65, color: 'warning' as const };
  }

  return { label: 'Fuerte', value: 100, color: 'success' as const };
});

async function signUp() {
  errorMsg.value = "";
  successMsg.value = "";

  if (!email.value.trim()) { errorMsg.value = "El correo es obligatorio."; return; }
  if (!password.value) { errorMsg.value = "La contraseña es obligatoria."; return; }
  if (password.value.length < 8) { errorMsg.value = "La contraseña debe tener al menos 8 caracteres."; return; }
  if (!/[A-Z]/.test(password.value)) { errorMsg.value = "La contraseña debe incluir al menos una mayúscula."; return; }
  if (!/[0-9]/.test(password.value)) { errorMsg.value = "La contraseña debe incluir al menos un número."; return; }
  if (!/[^A-Za-z0-9]/.test(password.value)) { errorMsg.value = "La contraseña debe incluir al menos un carácter especial."; return; }

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
    title="Crea tu cuenta"
    description="Registrate para iniciar trámites, dar seguimiento a tus solicitudes y acceder a una experiencia más rápida y organizada."
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
            <p class="text-sm text-muted">Tu espacio seguro para gestionar trámites legales con mayor claridad.</p>
          </div>
        </div>
      </div>

      <div class="grid gap-1 rounded-2xl border border-success/30 bg-success/10 p-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-success">Confianza</p>
        <p class="text-2xl font-bold text-highlighted">{{ customersCount }}</p>
        <p class="text-sm text-muted">usuarios activos usando la plataforma para consultar y dar seguimiento a sus procesos.</p>
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

    <UFormField label="Contraseña" name="password">
      <UInput
        v-model="password"
        :type="mostrarPassword ? 'text' : 'password'"
        placeholder="Crea una contraseña segura"
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

    <div class="grid gap-3 rounded-2xl border border-default/60 bg-default/30 p-4">
      <div class="flex items-center justify-between gap-3">
        <p class="text-sm font-medium text-highlighted">Fortaleza de la contraseña</p>
        <UBadge :color="passwordStrength.color" variant="soft">{{ passwordStrength.label }}</UBadge>
      </div>

      <UProgress :model-value="passwordStrength.value" :color="passwordStrength.color" />

      <div class="grid gap-2 text-sm text-muted sm:grid-cols-2">
        <div class="flex items-center gap-2">
          <UIcon :name="passwordChecks.minLength ? 'i-lucide-check-circle-2' : 'i-lucide-circle'" class="h-4 w-4" />
          <span>Mínimo 8 caracteres</span>
        </div>
        <div class="flex items-center gap-2">
          <UIcon :name="passwordChecks.upper ? 'i-lucide-check-circle-2' : 'i-lucide-circle'" class="h-4 w-4" />
          <span>Al menos una mayúscula</span>
        </div>
        <div class="flex items-center gap-2">
          <UIcon :name="passwordChecks.number ? 'i-lucide-check-circle-2' : 'i-lucide-circle'" class="h-4 w-4" />
          <span>Al menos un número</span>
        </div>
        <div class="flex items-center gap-2">
          <UIcon :name="passwordChecks.special ? 'i-lucide-check-circle-2' : 'i-lucide-circle'" class="h-4 w-4" />
          <span>Al menos un carácter especial</span>
        </div>
      </div>
    </div>

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

    <div class="grid gap-3 rounded-2xl border border-default/60 bg-default/20 p-4 text-sm">
      <div>
        <p class="font-semibold text-highlighted">Lo que podés hacer al registrarte</p>
        <p class="mt-1 text-muted">Guardar tus datos, iniciar trámites con menos fricción y consultar el estado de tus solicitudes desde un solo lugar.</p>
      </div>
    </div>

    <UDivider label="o" />

    <p class="text-center text-sm text-muted">
      ¿Ya tenés una cuenta?
      <NuxtLink to="/login" class="font-medium text-primary transition hover:underline">
        Iniciá sesión
      </NuxtLink>
    </p>

    <!-- <div class="grid gap-4 rounded-2xl border border-default/60 bg-default/20 p-4">
      <div>
        <p class="text-sm font-semibold text-highlighted">Lo que dicen nuestros usuarios</p>
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
    </div> -->
  </AuthCardShell>
</template>
