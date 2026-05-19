import { type Profile, type Order } from '~/types'

export const useOrders = () => {
  const supabase = useSupabaseClient()
  const { profile } = useUser()

  const orders = ref<Order[]>([])
  const loading = ref(false)

  const fetchOrders = async () => {
    loading.value = true
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          documents (*),
          customer:profiles!orders_user_id_fkey(*),
          assignee:profiles!orders_assigned_to_fkey(*),
          reports (*)
        `)

      if (profile.value?.role === 'customer') {
        query = query.eq('user_id', profile.value.id)
      } else if (profile.value?.role === 'employee') {
        // Employees can see all orders
      } else if (profile.value?.role === 'admin') {
        // Admin can see all orders
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      orders.value = ((data as unknown) as Order[]) || []
    } finally {
      loading.value = false
    }
  }

  const assignOrder = async (orderId: string) => {
    if (!profile.value || profile.value.role !== 'employee') return

    const { error } = await supabase
      .from('orders')
      .update({ assigned_to: profile.value.id, status: 'processing' })
      .eq('id', orderId)
      .is('assigned_to', null)

    if (error) throw error
    await fetchOrders()
  }

  const submitReport = async (orderId: string, aiScore: number, similarityScore: number, notes?: string) => {
    if (!profile.value || (profile.value.role !== 'employee' && profile.value.role !== 'admin')) {
      throw new Error('Unauthorized')
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('assigned_to')
      .eq('id', orderId)
      .single()

    if (orderError) throw orderError
    if (!order || order.assigned_to !== profile.value.id) {
      throw new Error('Order not assigned to you')
    }

    const { error } = await supabase
      .from('reports')
      .insert({
        order_id: orderId,
        ai_score: aiScore,
        similarity_score: similarityScore,
        details: notes ? { notes } : null
      })

    if (error) throw error

    await supabase
      .from('orders')
      .update({ status: 'completed' })
      .eq('id', orderId)

    await fetchOrders()
  }

  const downloadFile = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from('documents')
      .download(filePath)

    if (error) throw error

    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const downloadDocument = async (filePath: string, fileName: string) => {
    return downloadFile(filePath, fileName)
  }

  // Subscribe to real-time updates for employees and admins
  const subscribeToOrders = () => {
    if (profile.value?.role !== 'employee' && profile.value?.role !== 'admin') return

    const channel = supabase
      .channel('orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: profile.value?.role === 'admin' ? undefined : `assigned_to=is.null`
        },
        () => {
          fetchOrders()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  return {
    orders: readonly(orders),
    loading: readonly(loading),
    fetchOrders,
    assignOrder,
    submitReport,
    downloadDocument,
    subscribeToOrders
  }
}