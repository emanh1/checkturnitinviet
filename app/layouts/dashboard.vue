<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const open = ref(false)
const { profile, isAdmin, isEmployee } = useUser()

const items = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Dashboard',
    icon: 'i-lucide-layout-dashboard',
    to: '/dashboard',
    exact: true,
    onSelect: () => {
      open.value = false
    }
  },
  {
    label: 'Tải lên',
    icon: 'i-lucide-upload-cloud',
    to: '/dashboard/upload',
    onSelect: () => {
      open.value = false
    }
  },
  {
    label: 'Mua credits',
    icon: 'i-lucide-credit-card',
    to: '/dashboard/purchase',
    onSelect: () => {
      open.value = false
    }
  },
  ...(isEmployee.value || isAdmin.value ? [
    {
      label: 'Work',
      icon: 'i-lucide-briefcase',
      to: '/dashboard/work',
      onSelect: () => {
        open.value = false
      }
    }
  ] : []),
  {
    label: 'Cài đặt',
    icon: 'i-lucide-settings',
    to: '/dashboard/settings',
    onSelect: () => {
      open.value = false
    }
  },
  ...(isAdmin.value ? [
    {
      label: 'Quản lý Người dùng',
      icon: 'i-lucide-users',
      to: '/dashboard/users',
      onSelect: () => {
        open.value = false
      }
    },
    {
      label: 'Admin',
      icon: 'i-lucide-shield-check',
      to: '/dashboard/admin',
      onSelect: () => {
        open.value = false
      }
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

const supabase = useSupabaseClient()
const router = useRouter()

const logout =  async () => {
  await supabase.auth.signOut()
  await router.push('/')
}
</script>

<template>
  <div class="h-screen flex flex-col overflow-hidden">
    <AppAnnouncement />
    <UDashboardGroup unit="rem" class="flex-1">
      <UDashboardSidebar
        id="dashboard"
        v-model:open="open"
        class="bg-elevated/25"
        :ui="{ footer: 'lg:border-t lg:border-default' }"
      >

      <template #default="{ collapsed }">
        <!-- <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" /> -->
        <AppLogo />
        <UNavigationMenu
          :collapsed="collapsed"
          :items="items"
          orientation="vertical"
          tooltip
          popover
          highlight
        />
      </template>

      <template #footer="{ collapsed }">
        <UButton class="w-full" color="error" icon="i-lucide-log-out" label="Đăng xuất" variant="ghost" @click="logout"/>
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="groups" />

    <slot />
    </UDashboardGroup>
  </div>
</template>
