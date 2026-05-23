export default defineNuxtPlugin(async () => {
  const userStore = useUser();
  const supabase = useSupabaseClient();
  await userStore.fetch();

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_OUT") {
      userStore.clear();
      return;
    }
    
    if (session?.user && (event === "SIGNED_IN" || event === "USER_UPDATED")) {
      await userStore.fetch();
    }
  });
});
