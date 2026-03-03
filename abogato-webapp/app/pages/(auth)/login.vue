<script setup lang="ts">
const supabase = useSupabaseClient();
const user = useSupabaseUser();

const email = ref("");
const password = ref("");
const errorMsg = ref("");

async function signUp() {
  errorMsg.value = "";
  const { error } = await supabase.auth.signUp({
    email: email.value,
    password: password.value,
  });
  if (error) errorMsg.value = error.message;
}

async function signIn() {
  errorMsg.value = "";
  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  });
  if (error) errorMsg.value = error.message;
}

async function signOut() {
  await supabase.auth.signOut();
}

const ensureProfile = useEnsureProfile();

await ensureProfile("cliente");
</script>

<template>
  <div style="max-width: 520px; margin: 24px auto; padding: 16px">
    <h1>Login</h1>

    <p v-if="user">Sesión activa: {{ user.email }}</p>

    <div style="display: grid; gap: 8px; margin: 12px 0">
      <input v-model="email" placeholder="email" />
      <input v-model="password" placeholder="password" type="password" />
      <div style="display: flex; gap: 8px">
        <button @click="signIn">Sign in</button>
        <button @click="signUp">Sign up</button>
        <button v-if="user" @click="signOut">Sign out</button>
      </div>
      <p v-if="errorMsg" style="color: #b00020">{{ errorMsg }}</p>
    </div>

    <NuxtLink to="/instruments">Ir a instruments</NuxtLink>
    <NuxtLink to="/tickets">Ir a tickets cliente</NuxtLink>
    <NuxtLink to="/lawyer/tickets">Ir a tickets abogado</NuxtLink>
  </div>
</template>
