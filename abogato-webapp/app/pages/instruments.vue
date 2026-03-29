<script setup lang="ts">
const supabase = useSupabaseClient()
const user = useSupabaseUser()

type Instrument = {
  id: number
  name: string
  created_at: string | null
  owner_id: string | null
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

async function updateName(id: number, newName: string) {
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

async function remove(id: number) {
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
  <div class="mx-auto max-w-3xl space-y-6 py-8">
    <AppPageHeader
      eyebrow="Demo"
      title="Mis instruments"
      description="Demo simple conectada a Supabase con la misma base visual del resto de la app."
    >
      <template #actions>
        <UButton color="neutral" variant="outline" :loading="loading" @click="refresh">
          Actualizar
        </UButton>
      </template>
    </AppPageHeader>

    <UAlert
      v-if="errorMsg"
      color="error"
      variant="soft"
      title="No se pudo completar la acción"
      :description="errorMsg"
      class="mb-4"
    />

    <UCard v-if="!user">
      <div class="grid gap-4">
        <p class="text-sm text-muted">Necesitás iniciar sesión para ver y administrar tus datos.</p>
        <div>
          <UButton to="/login">Ir a login</UButton>
        </div>
      </div>
    </UCard>

    <div v-else class="grid gap-6">
      <UCard>
        <form class="grid gap-4 sm:grid-cols-[1fr_auto]" @submit.prevent="add">
          <UFormField label="Nuevo instrument">
            <UInput v-model="name" placeholder="New instrument name" />
          </UFormField>
          <div class="flex items-end">
            <UButton type="submit" :loading="loading">
              Agregar
            </UButton>
          </div>
        </form>
      </UCard>

      <SkeletonListCards v-if="loading && !instruments.length" :items="3" :actions="1" :meta-lines="1" />

      <div v-if="instruments.length" class="grid gap-3">
        <UCard v-for="inst in instruments" :key="inst.id">
          <div class="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <UFormField label="Nombre">
              <UInput
                :model-value="inst.name"
                @change="(e:any) => updateName(inst.id, e.target.value)"
              />
            </UFormField>
            <div class="flex items-end justify-end">
              <UButton type="button" color="error" variant="soft" :disabled="loading" @click="remove(inst.id)">
                Eliminar
              </UButton>
            </div>
          </div>
        </UCard>
      </div>

      <UCard v-else-if="!loading">
        <p class="text-sm text-muted">No hay instruments registrados.</p>
      </UCard>
    </div>
  </div>
</template>
