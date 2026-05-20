export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser();
  const userStore = useUser();

  if (!user.value) {
    return navigateTo("/login");
  }

  if (!userStore.isEmployee || !userStore.isAdmin) {
    return navigateTo("/dashboard");
  }
});
