import type { Database } from '~/types/database.types'

type Pricing = Database['public']['Tables']['pricing']['Row']

export const usePricing = () => {
  const supabase = useSupabaseClient()

  const pricing = ref<Pricing[]>([])
  const loading = ref(false)

  const fetchPricing = async () => {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('pricing')
        .select('*')
        .order('check_type')

      if (error) throw error
      pricing.value = data || []
    } finally {
      loading.value = false
    }
  }

  const updatePricing = async (updates: Array<Partial<Pricing> & { check_type: string }>) => {
    const promises = updates.map(update =>
      supabase
        .from('pricing')
        .update(update)
        .eq('check_type', update.check_type)
    )

    await Promise.all(promises)
    await fetchPricing()
  }

  return {
    pricing: readonly(pricing),
    loading: readonly(loading),
    fetchPricing,
    updatePricing
  }
}