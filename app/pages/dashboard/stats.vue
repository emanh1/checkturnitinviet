<script setup lang="ts">
import type { Period, Range } from "~/types";
import { sub } from "date-fns";

definePageMeta({
  middleware: "auth-admin",
  layout: "dashboard",
});

useSeoMeta({
  title: "Admin Dashboard",
});
const range = shallowRef<Range>({
  start: sub(new Date(), { days: 14 }),
  end: new Date(),
});
const period = ref<Period>("daily");
</script>

<template>
  <UDashboardPanel id="admin" :ui="{ body: 'lg:py-8' }">
    <template #header>
      <UDashboardToolbar>
        <template #left>
          <!-- NOTE: The `-ms-1` class is used to align with the `DashboardSidebarCollapse` button here. -->
          <LazyDashboardHomeDateRangePicker v-model="range" class="-ms-1" />
          <LazyDashboardHomePeriodSelect v-model="period" :range="range" />
        </template>
      </UDashboardToolbar>
    </template>
    <template #body>
      <LazyDashboardHomeStats :period="period" :range="range" />
      <LazyDashboardHomeChart :period="period" :range="range" />
      <LazyDashboardHomeSales :period="period" :range="range" />
    </template>
  </UDashboardPanel>
</template>
