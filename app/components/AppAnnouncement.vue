<script setup lang="ts">
const { settings } = useSettings()
</script>

<template>
  <div v-if="settings?.announcement_active && settings?.announcement_text" class="bg-primary-600 dark:bg-primary-500 px-4 py-3 text-white sm:flex sm:items-center sm:justify-center sm:px-6 lg:px-8">
    <p class="text-center text-sm font-medium">
      {{ settings.announcement_text }}
    </p>
  </div>
</template>
