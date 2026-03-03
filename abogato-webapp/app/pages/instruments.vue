<script setup lang="ts">
const supabase = useSupabaseClient()
const user = useSupabaseUser()

type Instrument = {
  id: string
  name: string
  created_at: string
  owner_id: string
}

const instruments = ref<Instrument[]>([])
const name = ref('')
const loading = ref(false)
const errorMsg = ref('')

async function refresh() {
  if (!user.value) {
    instruments.value = []
    return
  }

  loading.value = true
  errorMsg.value = ''

  const { data, error } = await supabase
    .from('instruments')
    .select('*')
    .order('created_at', { ascending: false })

  loading.value = false

  if (error) {
    errorMsg.value = error.message
    instruments.value = []
    return
  }

  instruments.value = data ?? []
}

async function add() {
  if (!user.value) {
    errorMsg.value = 'Debes iniciar sesión para agregar.'
    return
  }

  const trimmed = name.value.trim()
  if (!trimmed) return

  loading.value = true
  errorMsg.value = ''

  const { error } = await supabase
    .from('instruments')
    .insert([{ name: trimmed }]) // owner_id lo setea el trigger

  loading.value = false

  if (error) {
    errorMsg.value = error.message
    return
  }

  name.value = ''
  await refresh()
}

async function updateName(id: string, newName: string) {
  if (!user.value) {
    errorMsg.value = 'Debes iniciar sesión para editar.'
    return
  }

  const trimmed = newName.trim()
  if (!trimmed) return

  loading.value = true
  errorMsg.value = ''

  const { error } = await supabase
    .from('instruments')
    .update({ name: trimmed })
    .eq('id', id)

  loading.value = false

  if (error) {
    errorMsg.value = error.message
    return
  }

  await refresh()
}

async function remove(id: string) {
  if (!user.value) {
    errorMsg.value = 'Debes iniciar sesión para borrar.'
    return
  }

  loading.value = true
  errorMsg.value = ''

  const { error } = await supabase
    .from('instruments')
    .delete()
    .eq('id', id)

  loading.value = false

  if (error) {
    errorMsg.value = error.message
    return
  }

  await refresh()
}

/**
 * Importante:
 * Cuando el usuario cambia (login/logout), refrescamos.
 */
watch(user, () => {
  refresh()
}, { immediate: true })
</script>

<template>
  <div style="max-width: 720px; margin: 24px auto; padding: 16px;">
    <h1>Mis Instruments</h1>

    <div v-if="!user" style="margin-top: 12px;">
      <p>Necesitas iniciar sesión para ver y administrar tus datos.</p>
      <NuxtLink to="/login">Ir a login</NuxtLink>
    </div>

    <div v-else>
      <form @submit.prevent="add" style="display:flex; gap: 8px; margin: 16px 0;">
        <input v-model="name" placeholder="New instrument name" style="flex:1; padding: 8px;" />
        <button type="submit" :disabled="loading">Add</button>
        <button type="button" @click="refresh" :disabled="loading">Refresh</button>
      </form>

      <p v-if="errorMsg" style="color: #b00020;">{{ errorMsg }}</p>
      <p v-if="loading">Loading...</p>

      <ul style="padding-left: 18px;">
        <li v-for="inst in instruments" :key="inst.id" style="margin: 10px 0;">
          <input
            :value="inst.name"
            @change="(e:any) => updateName(inst.id, e.target.value)"
            style="padding: 6px; margin-right: 8px;"
          />
          <button type="button" @click="remove(inst.id)" :disabled="loading">Delete</button>
        </li>
      </ul>
    </div>
  </div>
</template>