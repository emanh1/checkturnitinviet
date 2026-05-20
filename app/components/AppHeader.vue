<script setup lang="ts">
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const router = useRouter();

const logout = async () => {
  await supabase.auth.signOut();
  await router.push("/");
};
</script>

<template>
  <UHeader>
    <template #left>
      <NuxtLink to="/">
        <AppLogo class="w-auto h-6 shrink-0" />
      </NuxtLink>
    </template>

    <template #right>
      <UColorModeButton />

      <template v-if="user">
        <UButton
          icon="i-lucide-layout-dashboard"
          variant="ghost"
          to="/dashboard"
          class="lg:hidden"
        />

        <UButton
          label="Dashboard"
          color="neutral"
          variant="outline"
          to="/dashboard"
          class="hidden lg:inline-flex"
        />
        <UButton
          label="Đăng xuất"
          color="neutral"
          variant="ghost"
          @click="logout"
          class="hidden lg:inline-flex"
        />
      </template>

      <template v-else>
        <UButton
          icon="i-lucide-log-in"
          color="neutral"
          variant="ghost"
          to="/login"
          class="lg:hidden"
        />

        <UButton
          label="Đăng nhập"
          color="neutral"
          variant="outline"
          to="/login"
          class="hidden lg:inline-flex"
        />

        <UButton
          label="Đăng ký"
          color="neutral"
          trailing-icon="i-lucide-arrow-right"
          class="hidden lg:inline-flex"
          to="/signup"
        />
      </template>
    </template>

    <template #body>
      <USeparator class="my-6" />

      <template v-if="user">
        <UButton
          label="Dashboard"
          color="neutral"
          variant="subtle"
          to="/dashboard"
          block
          class="mb-3"
        />
        <UButton label="Đăng xuất" color="neutral" @click="logout" block />
      </template>

      <template v-else>
        <UButton
          label="Đăng nhập"
          color="neutral"
          variant="subtle"
          to="/login"
          block
          class="mb-3"
        />
        <UButton label="Đăng ký" color="neutral" to="/signup" block />
      </template>
    </template>
  </UHeader>
</template>
