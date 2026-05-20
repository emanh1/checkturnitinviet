<script setup lang="ts">
definePageMeta({
  middleware: "auth",
  layout: "dashboard",
});

useSeoMeta({
  title: "Purchase Credits",
});

const { profile, isCustomer, loading } = useUser();
const { initiatePayment, isLoading } = usePayments();
const { settings, fetchSettings } = useSettings();
const router = useRouter();

onMounted(() => {
  fetchSettings();
});

const buyCredits = async (creditPackage: number) => {
  await initiatePayment(creditPackage);
};
</script>

<template>
  <!-- TODO REPLACE WITH NUMBER FORM TO BUY SPECIFIC NUMBER OF CREDITS -->
  <UDashboardPanel id="purchase" :ui="{ body: 'lg:py-8' }">
    <template #body>
      <div class="text-center">
        <h1 class="text-3xl font-bold text-slate-900 dark:text-white">
          Mua credits
        </h1>
        <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Mỗi credits có giá
          {{ (settings?.credit_price || 15000).toLocaleString("vi-VN") }} VND.
          Kiểm tra đơn giản: {{ settings?.ai_credit_cost || 1 }} credits, Combo:
          {{ settings?.combo_credit_cost || 2 }} credits.
        </p>
      </div>

      <div class="grid gap-6 md:grid-cols-3">
        <UCard>
          <template #header>
            <h2 class="text-xl font-semibold">Gói nhỏ</h2>
          </template>
          <div class="space-y-4">
            <div class="text-3xl font-bold text-primary">
              {{
                ((settings?.credit_price || 15000) * 10).toLocaleString("vi-VN")
              }}
              VND
            </div>
            <p class="text-sm text-slate-600 dark:text-slate-300">10 credits</p>
            <ul class="space-y-2 text-sm">
              <li>✓ 10 lần kiểm tra đơn giản</li>
              <li>✓ 5 lần kiểm tra combo</li>
              <li>✓ Báo cáo chi tiết</li>
              <li>✓ Hỗ trợ cơ bản</li>
            </ul>
          </div>
          <template #footer>
            <UButton
              color="primary"
              block
              :loading="isLoading"
              @click="buyCredits(10)"
              >Mua ngay</UButton
            >
          </template>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="text-xl font-semibold">Gói phổ biến</h2>
          </template>
          <div class="space-y-4">
            <div class="text-3xl font-bold text-primary">
              {{
                ((settings?.credit_price || 15000) * 50).toLocaleString("vi-VN")
              }}
              VND
            </div>
            <p class="text-sm text-slate-600 dark:text-slate-300">50 credits</p>
            <ul class="space-y-2 text-sm">
              <li>✓ 50 lần kiểm tra đơn giản</li>
              <li>✓ 25 lần kiểm tra combo</li>
              <li>✓ Báo cáo chi tiết</li>
              <li>✓ Hỗ trợ 24/7</li>
            </ul>
          </div>
          <template #footer>
            <UButton
              color="primary"
              block
              :loading="isLoading"
              @click="buyCredits(50)"
              >Mua ngay</UButton
            >
          </template>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="text-xl font-semibold">Gói lớn</h2>
          </template>
          <div class="space-y-4">
            <div class="text-3xl font-bold text-primary">
              {{
                ((settings?.credit_price || 15000) * 100).toLocaleString(
                  "vi-VN",
                )
              }}
              VND
            </div>
            <p class="text-sm text-slate-600 dark:text-slate-300">
              100 credits
            </p>
            <ul class="space-y-2 text-sm">
              <li>✓ 100 lần kiểm tra đơn giản</li>
              <li>✓ 50 lần kiểm tra combo</li>
              <li>✓ Báo cáo chi tiết</li>
              <li>✓ Hỗ trợ ưu tiên</li>
              <li>✓ API access</li>
            </ul>
          </div>
          <template #footer>
            <UButton
              color="primary"
              block
              :loading="isLoading"
              @click="buyCredits(100)"
              >Mua ngay</UButton
            >
          </template>
        </UCard>
      </div>

      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold">credits hiện có</h2>
        </template>
        <div class="text-center">
          <div class="text-4xl font-bold text-slate-900 dark:text-white">
            {{ profile?.credits ?? 0 }}
          </div>
          <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
            credits khả dụng
          </p>
        </div>
      </UCard>
    </template>
  </UDashboardPanel>
</template>
