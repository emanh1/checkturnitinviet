export default defineNuxtPlugin(async () => {
  const userStore = useUser()
  const supabase = useSupabaseClient()
  await userStore.fetch()

  supabase.auth.onAuthStateChange(async (_, session) => {
    if (session?.user) {
      await userStore.fetch()
    } else {
      userStore.clear()
    }
  })
})