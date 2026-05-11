export const formatBytes = (value: number | null | undefined) => {
  if (!value || value === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1)
  const size = value / Math.pow(1024, index)
  return `${size.toFixed(size < 10 && index > 0 ? 1 : 0)} ${units[index]}`
}

export const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '-'
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
}

import type { Order } from '~/types'

export const getFilePages = (order: Order) => {
  return order.reports?.details?.pages ?? order.documents?.pages ?? '-'
}
