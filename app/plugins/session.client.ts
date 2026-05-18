export default defineNuxtPlugin(async () => {
  const userStore = useUser()
  await userStore.fetch()
})