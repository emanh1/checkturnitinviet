<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

useSeoMeta({
  title: 'Dashboard'
})

const { profile, isCustomer, loading } = useUser()
const { orders, fetchOrders } = useOrders()
const router = useRouter()

watchEffect(() => {
  if (!loading.value && profile.value && !isCustomer.value) {
    router.push('/dashboard/work')
  }
})

const supportContacts = [
  { name: 'Phong', region: 'Vietnam', method: 'Zalo', href: 'https://zalo.me' },
  { name: 'Ayaan', region: 'Bangladesh', method: 'WA', href: 'https://wa.me' },
  { name: 'Ken', region: 'Kenya', method: 'WA', href: 'https://wa.me' }
]

import DashboardOrdersTable from '~/components/dashboard/OrdersTable.vue'

watch(isCustomer, async (customer) => {
  if (customer) {
    await fetchOrders()
  }
}, { immediate: true })
</script>

<template>
  <UDashboardPanel id="dashboard" :ui="{ body: 'lg:py-8' }">

    <div class="space-y-6">
      <UCard>
        <div class="space-y-4">
          <div>
            <h2 class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">Liên hệ nhanh</h2>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">Nếu bạn cần trợ giúp về tải lên hoặc thanh toán, chọn kênh phù hợp bên dưới.</p>
          </div>
          <div class="grid gap-4 sm:grid-cols-3">
            <div v-for="contact in supportContacts" :key="contact.name" class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-slate-950">
              <div class="flex items-center gap-3">
                <div class="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <UIcon name="i-lucide-user" class="h-5 w-5" />
                </div>
                <div>
                  <p class="text-sm font-semibold">{{ contact.name }}</p>
                  <p class="text-xs text-slate-500 dark:text-slate-400">{{ contact.region }} · {{ contact.method }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="grid gap-6 lg:grid-cols-[1.5fr_1fr] items-center">
          <div>
            <p class="text-sm font-semibold uppercase tracking-[0.2em] text-primary">credits</p>
            <h2 class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">Thông tin credits của bạn</h2>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">1 credits = 15.000 VND. Kiểm tra AI hoặc đạo văn dùng 1 credits, combo dùng 2 credits.</p>
          </div>
          <div class="rounded-4xl border border-slate-200 bg-slate-50 p-6 shadow-sm dark:border-neutral-800 dark:bg-slate-900">
            <p class="text-sm text-slate-500 dark:text-slate-400">credits hiện có</p>
            <p class="mt-2 text-4xl font-semibold text-slate-900 dark:text-white">{{ profile?.credits ?? 0 }}</p>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Giá mỗi credits: 15.000 VND</p>
            <div class="mt-4 flex flex-wrap gap-3">
              <UButton to="/dashboard/purchase" color="primary">Mua thêm credits</UButton>
            </div>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="text-xl font-semibold text-slate-900 dark:text-white">Danh sách tài liệu</h2>
              <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">Xem trạng thái kiểm tra và kết quả cho các tài liệu đã tải lên.</p>
            </div>
            <UButton to="/dashboard/upload" variant="outline">Tải lên tài liệu mới</UButton>
          </div>
        </template>

        <DashboardOrdersTable
          :orders="orders"
          user-role="customer"
          :profile-id="profile?.id"
        >
          <template #empty-state>
            Bạn chưa có tài liệu nào để hiển thị. Hãy tải lên tài liệu mới ngay.
          </template>
        </DashboardOrdersTable>
      </UCard>
    </div>
  </UDashboardPanel>
</template>
