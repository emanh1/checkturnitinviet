import type { Database } from '~/types/database.types'

type Profile =
  Database['public']['Tables']['profiles']['Row']

export const useUser = () => {
  const profile = useState<Profile | null>(
    'profile',
    () => null
  )

  const loading = useState(
    'profile-loading',
    () => false
  )

  const clear = async () => {
    profile.value = null
  }

  const fetch = async () => {
    loading.value = true

    try {
      const data = await $fetch<Profile>('/api/user/me')
      profile.value = data
    } catch (e: any) {
      console.log(e)
    } finally {
      loading.value = false
    }
  }

  return {
    profile: readonly(profile),
    loading: readonly(loading),
    fetch,
    clear,
    isAdmin: computed(
      () => profile.value?.role === 'admin'
    ),

    isEmployee: computed(
      () =>
        ['employee', 'admin'].includes(
          profile.value?.role ?? ''
        )
    ),

    isCustomer: computed(
      () => profile.value?.role === 'customer'
    )
  }
}