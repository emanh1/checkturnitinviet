export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()
  const userStore = useUser()

  if (!user.value) {
    return navigateTo('/login')
  }

  if (!userStore.isAdmin) {
    return navigateTo('/dashboard')
  }
})
