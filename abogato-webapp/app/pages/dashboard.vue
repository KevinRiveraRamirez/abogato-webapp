<script setup lang="ts">
import { getDashboardPathForRole } from '~/utils/app-navigation'

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

  await navigateTo(getDashboardPathForRole(data?.role), { replace: true })
}
</script>

<template>
  <div />
</template>
