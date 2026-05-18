<script setup lang="ts">
import { useFileUpload as useCustomFileUpload } from '~/composables/useFileUpload'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

useSeoMeta({
  title: 'Upload Document'
})

const { profile, isCustomer, loading } = useUser()
const { uploadFile } = useCustomFileUpload()
const router = useRouter()
const toast = useToast()

const checkType = ref<'ai' | 'similarity' | 'combo'>('combo')
const uploading = ref(false)

const handleFileDrop = async (files: File[]) => {
  if (files.length === 0) return

  const file = files[0]!
  uploading.value = true

  try {
    await uploadFile(file, checkType.value)
    toast.add({
      title: 'Upload thành công',
      description: 'Tài liệu đã được tải lên và đơn hàng đã được tạo'
    })
    await router.push('/dashboard')
  } catch (error: unknown) {
    const err = error as Error
    toast.add({
      title: 'Lỗi upload',
      description: err.message,
      color: 'error'
    })
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="upload" :ui="{ body: 'lg:py-8' }">
    <UDashboardNavbar title="Tải lên tài liệu">
      <template #right>
        <UDashboardSidebarCollapse />
      </template>
    </UDashboardNavbar>

    <div class="space-y-6">
      <div class="text-center">
        <h1 class="text-3xl font-bold text-slate-900 dark:text-white">Tải lên tài liệu</h1>
        <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Chọn loại kiểm tra và tải lên tài liệu của bạn để bắt đầu. Kiểm tra đơn giản: 1 credits, Combo: 2 credits.
        </p>
      </div>

      <UCard>
        <div class="mb-6">
          <UFormField label="Loại kiểm tra">
            <USelect
              v-model="checkType"
              :options="[
                { label: 'Combo (AI + Đạo văn)', value: 'combo' },
                { label: 'Chỉ AI', value: 'ai' },
                { label: 'Chỉ Đạo văn', value: 'similarity' }
              ]"
            />
          </UFormField>
        </div>
        <UFileUpload
          accept=".pdf,.docx,.doc,.txt"
          :disabled="uploading"
          @change="(files) => handleFileDrop(Array.from(files))"
        />
      </UCard>
    </div>
  </UDashboardPanel>
</template>