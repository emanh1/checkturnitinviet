<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

useSeoMeta({
  title: 'Cài đặt'
})

const toast = useToast()
const { profile, updateProfile, isAdmin } = useUser()
const { settings, fetchSettings, updateSettings } = useSettings()

const isSavingProfile = ref(false)
const profileForm = ref({
  name: ''
})

const isSavingSystem = ref(false)
const systemForm = ref({
  credit_price: 15000,
  ai_credit_cost: 1,
  similarity_credit_cost: 1,
  combo_credit_cost: 2,
  announcement_text: '',
  announcement_active: false
})

onMounted(async () => {
  if (profile.value) {
    profileForm.value.name = profile.value.name || ''
  }

  if (isAdmin.value) {
    const s = await fetchSettings(true)
    if (s) {
      systemForm.value = {
        credit_price: s.credit_price,
        ai_credit_cost: s.ai_credit_cost,
        similarity_credit_cost: s.similarity_credit_cost,
        combo_credit_cost: s.combo_credit_cost,
        announcement_text: s.announcement_text || '',
        announcement_active: s.announcement_active
      }
    }
  }
})

const handleSaveProfile = async () => {
  if (!profileForm.value.name.trim()) {
    toast.add({ title: 'Lỗi', description: 'Tên không được để trống', color: 'error' })
    return
  }

  isSavingProfile.value = true
  try {
    await updateProfile({ name: profileForm.value.name })
    toast.add({ title: 'Thành công', description: 'Đã cập nhật thông tin cá nhân', color: 'primary' })
  } catch (error: unknown) {
    const err = error as Error
    toast.add({ title: 'Lỗi', description: err.message || 'Không thể lưu', color: 'error' })
  } finally {
    isSavingProfile.value = false
  }
}

const handleSaveSystem = async () => {
  isSavingSystem.value = true
  try {
    await updateSettings({
      ...systemForm.value
    })
    toast.add({ title: 'Thành công', description: 'Đã cập nhật cài đặt hệ thống', color: 'primary' })
  } catch (error: unknown) {
    const err = error as Error
    toast.add({ title: 'Lỗi', description: err.message || 'Không thể lưu cài đặt hệ thống', color: 'error' })
  } finally {
    isSavingSystem.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="settings" :ui="{ body: 'lg:py-8' }">
    <UDashboardNavbar title="Cài đặt">
      <template #right>
        <UDashboardSidebarCollapse />
      </template>
    </UDashboardNavbar>

    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold text-slate-900 dark:text-white">Cài đặt</h1>
        <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Quản lý thông tin tài khoản và cài đặt.
        </p>
      </div>

      <div class="grid gap-6 md:grid-cols-2">
        <!-- Profile Settings -->
        <UCard>
          <template #header>
            <h2 class="text-xl font-semibold">Hồ sơ cá nhân</h2>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">Cập nhật thông tin hiển thị của bạn.</p>
          </template>

          <form @submit.prevent="handleSaveProfile" class="space-y-4">
            <UFormField label="Tên hiển thị">
              <UInput v-model="profileForm.name" placeholder="Nhập tên của bạn" />
            </UFormField>

            <div class="flex justify-end">
              <UButton type="submit" color="primary" :loading="isSavingProfile">Lưu thay đổi</UButton>
            </div>
          </form>
        </UCard>

        <!-- Admin Settings -->
        <UCard v-if="isAdmin">
          <template #header>
            <h2 class="text-xl font-semibold">Cài đặt hệ thống (Admin)</h2>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">Quản lý giá trị quy đổi và thông báo.</p>
          </template>

          <form @submit.prevent="handleSaveSystem" class="space-y-4">
            <UFormField label="Giá 1 Credit (VNĐ)">
              <UInput v-model="systemForm.credit_price" type="number" min="0" />
            </UFormField>

            <div class="grid grid-cols-3 gap-4">
              <UFormField label="Phí AI">
                <UInput v-model="systemForm.ai_credit_cost" type="number" min="0" />
              </UFormField>
              <UFormField label="Phí Đạo văn">
                <UInput v-model="systemForm.similarity_credit_cost" type="number" min="0" />
              </UFormField>
              <UFormField label="Phí Combo">
                <UInput v-model="systemForm.combo_credit_cost" type="number" min="0" />
              </UFormField>
            </div>

            <USeparator class="my-4" />

            <UFormField label="Bật thông báo băng rôn">
              <USwitch v-model="systemForm.announcement_active" />
            </UFormField>

            <UFormField label="Nội dung thông báo (hỗ trợ văn bản)">
              <UTextarea v-model="systemForm.announcement_text" placeholder="Khuyến mãi đặc biệt hôm nay..." :disabled="!systemForm.announcement_active" />
            </UFormField>

            <div class="flex justify-end">
              <UButton type="submit" color="primary" :loading="isSavingSystem">Lưu hệ thống</UButton>
            </div>
          </form>
        </UCard>
      </div>
    </div>
  </UDashboardPanel>
</template>
