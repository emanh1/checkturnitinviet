import type { Database } from '~/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

export const useUser = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const profile = useState<Profile | null>('checkturnit-profile', () => null)
  const loading = useState<boolean>('checkturnit-profile-loading', () => true)

  const fetchProfile = async () => {
    if (!user.value || !user.value.id) {
      profile.value = null
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.value.id)
      .single()

    if (error) {
      const message = String(error.message || '').toLowerCase()
      const details = typeof error === 'object' && error !== null && 'details' in error ? String(error.details || '').toLowerCase() : ''
      const noRowFound = message.includes('no rows') || details.includes('no rows')

      if (noRowFound) {
        const defaultName =
          user.value.user_metadata?.name ||
          user.value.email?.split('@')[0] ||
          'User'

        const { data: created, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.value.id,
            name: defaultName,
            credits: 0,
            role: 'customer'
          })
          .select()
          .single()

        if (createError) {
          console.error('Error creating profile:', createError)
          return
        }

        profile.value = created
        return
      }

      console.error('Error fetching profile:', error)
      return
    }

    profile.value = data
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user.value) return

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.value.id)
      .select()
      .single()

    if (error) {
      throw error
    }

    profile.value = data
  }

  const isAdmin = computed(() => profile.value?.role === 'admin')
  const isEmployee = computed(() => profile.value?.role === 'employee')
  const isCustomer = computed(() => profile.value?.role === 'customer')

  // Fetch profile when user changes
  watchEffect(async () => {
    loading.value = true
    if (user.value) {
      await fetchProfile()
    } else {
      profile.value = null
    }
    loading.value = false
  })

  return {
    profile: readonly(profile),
    loading: readonly(loading),
    fetchProfile,
    updateProfile,
    isAdmin,
    isEmployee,
    isCustomer
  }
}