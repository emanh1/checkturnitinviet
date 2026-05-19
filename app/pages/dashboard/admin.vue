<script setup lang="ts">
import type { Period, Range, Order } from '~/types'
import { sub } from 'date-fns'

definePageMeta({
  middleware: 'auth-admin',
  layout: 'dashboard'
})

useSeoMeta({
  title: 'Admin Dashboard'
})

const { profile, isAdmin, loading } = useUser()
const { orders, fetchOrders, assignOrder, submitReport, downloadDocument, subscribeToOrders } = useOrders()
const router = useRouter()
const supabase = useSupabaseClient()
const toast = useToast()

const reportModal = ref(false)
const currentOrder = ref<Order | null>(null)
const aiScore = ref(0)
const similarityScore = ref(0)
const notes = ref('')

const range = shallowRef<Range>({
  start: sub(new Date(), { days: 14 }),
  end: new Date()
})
const period = ref<Period>('daily')

// Statistics
const stats = ref({
  totalChecks: 0,
  checksToday: 0,
  checksThisWeek: 0,
  checksThisMonth: 0,
  totalCustomers: 0,
  totalFiles: 0,
  avgFilesPerCustomer: 0,
  topCustomers: [] as { name: string, count: number }[]
})

const handleAssignOrder = async (order: Order) => {
  try {
    await assignOrder(order.id)
    toast.add({
      title: 'Đã nhận đơn hàng',
      description: 'Bạn đã nhận xử lý đơn hàng này'
    })
  } catch (error: any) {
    toast.add({
      title: 'Lỗi',
      description: error.message,
      color: 'error'
    })
  }
}

const openReportModal = (order: Order) => {
  currentOrder.value = order
  aiScore.value = 0
  similarityScore.value = 0
  notes.value = ''
  reportModal.value = true
}

const submitOrderReport = async () => {
  if (!currentOrder.value) return

  try {
    await submitReport(currentOrder.value.id, aiScore.value, similarityScore.value, notes.value)
    toast.add({
      title: 'Nộp báo cáo thành công',
      description: 'Báo cáo đã được gửi cho khách hàng'
    })
    reportModal.value = false
    currentOrder.value = null
  } catch (error: any) {
    toast.add({
      title: 'Lỗi',
      description: error.message,
      color: 'error'
    })
  }
}

const handleDownload = async (order: Order) => {
  try {
    await downloadDocument(order.documents.file_path, order.documents.file_name)
  } catch (error: any) {
    toast.add({
      title: 'Lỗi tải xuống',
      description: error.message,
      color: 'error'
    })
  }
}

const fetchStats = async () => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1)

  // Total checks
  const { count: totalChecks } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })

  // Checks today
  const { count: checksToday } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today.toISOString())

  // Checks this week
  const { count: checksThisWeek } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekAgo.toISOString())

  // Checks this month
  const { count: checksThisMonth } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', monthAgo.toISOString())

  // Total customers
  const { count: totalCustomers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'customer')

  // Total files and avg per customer
  const { data: customerStats } = await supabase
    .from('orders')
    .select('user_id, customer:profiles!orders_user_id_fkey(name)')
    .eq('status', 'completed')

  const filesPerCustomer = customerStats?.reduce((acc: Record<string, { count: number, name: string }>, order) => {
    const name = (order.profiles as any)?.name || 'Người dùng ẩn danh'
    if (!acc[order.user_id!]) {
      acc[order.user_id!] = { count: 0, name }
    }
    acc[order.user_id!].count++
    return acc
  }, {}) || {}

  const topCustomers = Object.values(filesPerCustomer)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const totalFiles = Object.values(filesPerCustomer).reduce((sum, item) => sum + item.count, 0) as number
  const avgFilesPerCustomer = totalCustomers ? totalFiles / totalCustomers : 0

  stats.value = {
    totalChecks: totalChecks || 0,
    checksToday: checksToday || 0,
    checksThisWeek: checksThisWeek || 0,
    checksThisMonth: checksThisMonth || 0,
    totalCustomers: totalCustomers || 0,
    totalFiles,
    avgFilesPerCustomer,
    topCustomers
  }
}

const unsubscribeOrders = ref<(() => void) | null>(null)

watch([isAdmin], async ([admin]) => {
  if (admin) {
    await fetchOrders()
    await fetchStats()
  }
}, { immediate: true })

watch(isAdmin, (admin) => {
  if (admin) {
    unsubscribeOrders.value = subscribeToOrders() || null
  } else if (unsubscribeOrders.value) {
    unsubscribeOrders.value()
    unsubscribeOrders.value = null
  }
}, { immediate: true })

onUnmounted(() => {
  if (unsubscribeOrders.value) {
    unsubscribeOrders.value()
  }
})
</script>

<template>
  <UDashboardPanel id="admin" :ui="{ body: 'lg:py-8' }">
    <template #header>
      <UDashboardToolbar>
        <template #left>
          <!-- NOTE: The `-ms-1` class is used to align with the `DashboardSidebarCollapse` button here. -->
          <DashboardHomeDateRangePicker v-model="range" class="-ms-1" />
          <DashboardHomePeriodSelect v-model="period" :range="range" />
        </template>
      </UDashboardToolbar>
    </template>
    <template #body>
      <DashboardHomeStats :period="period" :range="range" />
      <DashboardHomeChart :period="period" :range="range" />
      <DashboardHomeSales :period="period" :range="range" />

      <!-- Top Customers -->
      <UCard v-if="stats.topCustomers.length > 0">
        <template #header>
          <h2 class="text-xl font-semibold">Khách hàng tải lên nhiều nhất</h2>
        </template>
        <div class="space-y-4">
          <div v-for="(customer, index) in stats.topCustomers" :key="index"
            class="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2 last:border-0 last:pb-0">
            <div class="flex items-center gap-3">
              <div
                class="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-400 font-bold text-xs">
                {{ index + 1 }}
              </div>
              <span class="text-sm font-medium text-slate-900 dark:text-white">{{ customer.name }}</span>
            </div>
            <span class="text-sm text-slate-600 dark:text-slate-300 font-semibold">{{ customer.count }} tài liệu</span>
          </div>
        </div>
      </UCard>
    </template>
  </UDashboardPanel>
</template>