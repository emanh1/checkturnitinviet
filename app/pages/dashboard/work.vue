<script setup lang="ts">
import type { Order } from '~/types'
import DashboardOrdersTable from '~/components/dashboard/OrdersTable.vue'

definePageMeta({
  middleware: 'auth-employee',
  layout: 'dashboard'
})

useSeoMeta({
  title: 'Work Dashboard'
})

const { profile, isEmployee, isAdmin, loading } = useUser()
const { orders, fetchOrders, assignOrder, submitReport, downloadDocument, subscribeToOrders } = useOrders()
const router = useRouter()
const toast = useToast()

const reportModal = ref(false)
const currentOrder = ref<Order | null>(null)
const aiScore = ref(0)
const similarityScore = ref(0)
const notes = ref('')

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

const unsubscribeOrders = ref<(() => void) | null>(null)

watch([isEmployee, isAdmin], async ([employee, admin]) => {
  if (employee || admin) {
    await fetchOrders()
  }
}, { immediate: true })

watch(isEmployee, (employee) => {
  if (employee) {
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
  <UDashboardPanel id="work" :ui="{ body: 'lg:py-8' }">
    <template #body>

      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold">Đơn hàng cần xử lý</h2>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">Đơn hàng chưa được giao hoặc đang xử lý bởi bạn.
          </p>
        </template>

        <DashboardOrdersTable :orders="orders" user-role="employee" :profile-id="profile!.id"
          @assign="handleAssignOrder" @download-document="handleDownload" @submit-report="openReportModal">
          // TODO ^^ LOL
          <template #empty-state>
            Không có đơn hàng nào để xử lý.
          </template>
        </DashboardOrdersTable>
      </UCard>

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
    </template>
  </UDashboardPanel>
</template>