<script setup lang="ts">
import type { Order } from '~/types'
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

import DashboardOrdersTable from '~/components/dashboard/OrdersTable.vue'

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
    .select('user_id, profiles(name)')
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
    <UDashboardNavbar title="Admin Dashboard">
      <template #right>
        <UDashboardSidebarCollapse />
      </template>
    </UDashboardNavbar>

    <div class="space-y-6">
      <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 class="text-3xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
          <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Quản lý hệ thống và xử lý đơn hàng — Xin chào, {{ profile?.name || 'Admin' }}
          </p>
        </div>
      </div>

      <!-- Statistics -->
      <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <UCard>
          <div class="text-center">
            <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ stats.totalChecks }}</div>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">Tổng số kiểm tra</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ stats.checksToday }}</div>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">Kiểm tra hôm nay</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ stats.checksThisWeek }}</div>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">Kiểm tra tuần này</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ stats.checksThisMonth }}</div>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">Kiểm tra tháng này</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ stats.totalCustomers }}</div>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">Tổng khách hàng</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ stats.totalFiles }}</div>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">Tổng file đã xử lý</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ stats.avgFilesPerCustomer.toFixed(1) }}</div>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">File trung bình/khách</p>
          </div>
        </UCard>
      </div>

      <!-- Top Customers -->
      <UCard v-if="stats.topCustomers.length > 0">
        <template #header>
          <h2 class="text-xl font-semibold">Khách hàng tải lên nhiều nhất</h2>
        </template>
        <div class="space-y-4">
          <div v-for="(customer, index) in stats.topCustomers" :key="index" class="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2 last:border-0 last:pb-0">
            <div class="flex items-center gap-3">
              <div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-400 font-bold text-xs">
                {{ index + 1 }}
              </div>
              <span class="text-sm font-medium text-slate-900 dark:text-white">{{ customer.name }}</span>
            </div>
            <span class="text-sm text-slate-600 dark:text-slate-300 font-semibold">{{ customer.count }} tài liệu</span>
          </div>
        </div>
      </UCard>

      <!-- Orders Table -->
      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold">Đơn hàng cần xử lý</h2>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">Đơn hàng chưa được giao hoặc đang xử lý.</p>
        </template>

        <DashboardOrdersTable
          :orders="orders"
          user-role="admin"
          :profile-id="profile?.id"
          @assign="handleAssignOrder"
          @download-document="handleDownload"
          @submit-report="openReportModal"
        >
          <template #empty-state>
            Không có đơn hàng nào để xử lý.
          </template>
        </DashboardOrdersTable>
      </UCard>
    </div>

    <UModal v-model="reportModal">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Nộp báo cáo</h3>
        </template>
        <div class="space-y-4">
          <UFormField label="Điểm AI (0-100)">
            <USlider v-model="aiScore" :min="0" :max="100" />
            <div class="text-center mt-2">{{ aiScore }}%</div>
          </UFormField>
          <UFormField label="Điểm đạo văn (0-100)">
            <USlider v-model="similarityScore" :min="0" :max="100" />
            <div class="text-center mt-2">{{ similarityScore }}%</div>
          </UFormField>
          <UFormField label="Ghi chú thêm">
            <UTextarea v-model="notes" placeholder="Nhập ghi chú về báo cáo..." :rows="3" />
          </UFormField>
        </div>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="outline" @click="reportModal = false">Hủy</UButton>
            <UButton color="primary" @click="submitOrderReport">Nộp báo cáo</UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </UDashboardPanel>
</template>