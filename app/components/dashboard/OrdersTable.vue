<script setup lang="ts">
import { formatBytes, formatDateTime, getFilePages } from '~/utils/formatters'
import type { Order } from '~/types'

const props = defineProps<{
  orders: Order[]
  userRole: 'customer' | 'employee' | 'admin'
  profileId: string | undefined
}>()

const emit = defineEmits<{
  (e: 'assign', order: Order): void
  (e: 'download-document', order: Order): void
  (e: 'submit-report', order: Order): void
}>()
</script>

<template>
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
      <thead class="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500 dark:bg-slate-900 dark:text-slate-400">
        <tr>
          <th class="px-4 py-3">File name</th>
          <th class="px-4 py-3">File size</th>
          <th class="px-4 py-3">Pages</th>
          <th v-if="userRole !== 'customer'" class="px-4 py-3">Customer</th>
          <th v-if="userRole === 'customer'" class="px-4 py-3">AI</th>
          <th v-if="userRole === 'customer'" class="px-4 py-3">Similarity</th>
          <th class="px-4 py-3">Time added</th>
          <th class="px-4 py-3">Status</th>
          <th class="px-4 py-3">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-950">
        <tr v-for="order in orders" :key="order.id">
          <td class="px-4 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">{{ order.documents.file_name }}</td>
          <td class="px-4 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{{ formatBytes(order.documents.file_size) }}</td>
          <td class="px-4 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{{ getFilePages(order) }}</td>
          
          <td v-if="userRole !== 'customer'" class="px-4 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
            {{ order.profiles?.name || 'Unknown' }}
          </td>
          
          <td v-if="userRole === 'customer'" class="px-4 py-4 whitespace-nowrap text-sm font-semibold text-slate-900 dark:text-white">
            {{ order.reports?.ai_score ?? '-' }}%
          </td>
          <td v-if="userRole === 'customer'" class="px-4 py-4 whitespace-nowrap text-sm font-semibold text-slate-900 dark:text-white">
            {{ order.reports?.similarity_score ?? '-' }}%
          </td>

          <td class="px-4 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
            {{ formatDateTime(order.created_at || order.documents.uploaded_at) }}
          </td>
          <td class="px-4 py-4 whitespace-nowrap text-sm">
            <span :class="['inline-flex rounded-full px-3 py-1 text-xs font-semibold',
              order.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200' :
              order.status === 'processing' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200' :
              'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200']">
              {{ order.status || 'pending' }}
            </span>
          </td>
          
          <td class="px-4 py-4 whitespace-nowrap text-sm space-x-2">
            <!-- Admin/Employee Actions -->
            <template v-if="userRole !== 'customer'">
              <UButton
                v-if="!order.assigned_to"
                size="sm"
                color="primary"
                variant="outline"
                @click="emit('assign', order)"
              >
                Nhận
              </UButton>
              <UButton
                v-if="order.assigned_to === profileId"
                size="sm"
                variant="outline"
                @click="emit('download-document', order)"
              >
                Tải xuống
              </UButton>
              <UButton
                v-if="order.assigned_to === profileId && order.status === 'processing'"
                size="sm"
                color="primary"
                @click="emit('submit-report', order)"
              >
                Nộp báo cáo
              </UButton>
            </template>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="orders.length === 0" class="py-8 text-center text-slate-500 dark:text-slate-400">
      <slot name="empty-state">
        Không có dữ liệu.
      </slot>
    </div>
  </div>
</template>
