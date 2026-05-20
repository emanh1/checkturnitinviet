<template>
  <USeparator class="h-px" />

  <UFooter :ui="{ top: 'border-b border-default' }">
    <template #top>
      <UContainer class="flex flex-col items-center text-center gap-2">
        <AppLogo class="w-auto h-6 shrink-0 text-center" />
        <p>
          Dịch vụ kiểm tra đạo văn & phát hiện nội dung AI chuyên nghiệp. Bảo
          mật 100%.
        </p>
      </UContainer>
    </template>

    <template #left>
      <p class="text-muted text-sm">
        CheckTurnitinViet • © {{ new Date().getFullYear() }}
      </p>
    </template>

    <template #right>
      <UButton
        to="https://zalo.me/84986408788"
        target="_blank"
        icon="i-simple-icons-zalo"
        aria-label="CheckTurnitinViet"
        color="primary"
        variant="ghost"
      />
      <UButton
        to="mailto:contact@checkturnitinviet.com"
        icon="i-lucide-mail"
        aria-label="contact@checkturnitinviet.com"
        label="contact@checkturnitinviet.com"
        color="neutral"
        variant="ghost"
      />
    </template>
  </UFooter>
</template>
