<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const supabase = useSupabaseClient()

const { data: { user } } = await supabase.auth.getUser()

if (!user) {
  await navigateTo('/login', { replace: true })
} else {
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (data?.role === 'admin') {
    await navigateTo('/admin/dashboard', { replace: true })
  } else if (data?.role === 'abogado') {
    await navigateTo('/lawyer/dashboard', { replace: true })
  } else {
    await navigateTo('/client/dashboard', { replace: true })
  }
}
</script>

<template>
  <div />
</template>
