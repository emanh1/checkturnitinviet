<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
const supabase = useSupabaseClient()
const router = useRouter()

const logout = async () => {
  await supabase.auth.signOut()
  await router.push('/')
}

const { isAdmin, isEmployee } = useUser()

const items = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Dashboard',
    icon: 'i-lucide-layout-dashboard',
    to: '/dashboard',
    exact: true,
  },
  {
    label: 'Tải lên',
    icon: 'i-lucide-upload-cloud',
    to: '/dashboard/upload',
  },
  {
    label: 'Mua credits',
    icon: 'i-lucide-credit-card',
    to: '/dashboard/purchase',
  },
  ...(isEmployee.value || isAdmin.value ? [
    {
      label: 'Các file cần check',
      icon: 'i-lucide-briefcase',
      to: '/dashboard/work',
    }
  ] : []),

  ...(isAdmin.value ? [
    {
      label: 'Quản lý Người dùng',
      icon: 'i-lucide-users',
      to: '/dashboard/users',
    },
    {
      label: 'Admin',
      icon: 'i-lucide-shield-check',
      to: '/dashboard/admin',
    },
    {
      label: 'Cài đặt',
      icon: 'i-lucide-settings',
      to: '/dashboard/settings',
    }
  ] : [])
])

const groups = computed(() => [
  {
    id: 'navigation',
    label: 'Navigation',
    items: items.value.map((item) => ({
      id: item.to ?? item.label,
      label: item.label,
      icon: item.icon,
      description: `Đi đến ${item.label}`,
      to: item.to,
      target: item.target
    }))
  },
  {
    id: 'support',
    label: 'Support',
    items: [
      {
        id: 'support',
        label: 'Help & Support',
        icon: 'i-lucide-help-circle',
        description: 'Mở trang trợ giúp',
        to: 'https://zalo.me',
        target: '_blank'
      }
    ]
  }
])

</script>

<template>
  <AppAnnouncement />
  <UDashboardGroup unit="rem">
    <UDashboardSidebar id="dashboard" class="bg-elevated/25" :ui="{ footer: 'lg:border-t lg:border-default' }">

      <template #default="{ collapsed }">
        <!-- <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" /> -->
        <AppLogo />
        <UNavigationMenu :collapsed="collapsed" :items="items" orientation="vertical" tooltip popover highlight />
      </template>

      <template #footer="{ collapsed }">
        <UColorModeButton />
        <UButton class="w-full" color="error" icon="i-lucide-log-out" label="Đăng xuất" variant="ghost"
          @click="logout" />
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="groups" />
    <slot />
  </UDashboardGroup>
</template>
