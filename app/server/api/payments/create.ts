import { serverSupabaseUser } from '#supabase/server'
import crypto from 'crypto'
import { z } from 'zod'

export default eventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const { creditPackage } = await readValidatedBody(event, z.object({
    creditPackage: z.number().gt(0)
  }).parse)

  const supabase = useSupabaseClient()
  const config = useRuntimeConfig()

  const tmnCode = config.vnpayTmnCode
  const hashSecret = config.vnpayHashSecret
  const returnUrl = config.vnpayReturnUrl

  if (!tmnCode || !hashSecret || !returnUrl) {
    throw createError({
      statusCode: 500,
      message: 'VNPay configuration is missing'
    })
  }

  // Fetch dynamic credit price from settings
  const { data: settings } = await supabase.from('system_settings').select('credit_price').single()
  const creditPrice = settings?.credit_price || 15000

  // Calculate amount
  const amount = creditPackage * creditPrice * 100 // VNPay expects amount in cents

  // Create payment record in database
  const transactionId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

  const { data: paymentRecord, error: dbError } = await supabase
    .from('payments')
    .insert({
      user_id: user.id,
      amount: creditPackage * creditPrice,
      currency: 'VND',
      method: 'vnpay',
      status: 'pending',
      transaction_id: transactionId,
      credits_added: creditPackage
    })
    .select()
    .single()

  if (dbError) {
    throw createError({
      statusCode: 500,
      message: 'Failed to create payment record'
    })
  }

  // Generate VNPay payment URL
  const createDate = new Date()
  const createDateStr = formatDate(createDate)
  const expireDate = new Date(createDate.getTime() + 15 * 60000) // 15 minutes expiry
  const expireDateStr = formatDate(expireDate)

  const vnpayParams: Record<string, string> = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Locale: 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: transactionId,
    vnp_OrderInfo: `Mua ${creditPackage} credits`,
    vnp_OrderType: 'other',
    vnp_Amount: amount.toString(),
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: getClientIP(event),
    vnp_CreateDate: createDateStr,
    vnp_ExpireDate: expireDateStr
  }

  // Sort parameters
  const sortedParams = Object.keys(vnpayParams)
    .sort()
    .reduce((result, key) => {
      result[key] = vnpayParams[key]
      return result
    }, {} as Record<string, string>)

  // Create signature
  const signData = Object.keys(sortedParams)
    .map(key => `${key}=${encodeURIComponent(sortedParams[key])}`)
    .join('&')

  const hmac = crypto.createHmac('sha512', hashSecret)
  const signature = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex')

  const paymentUrl = `https://sandbox.vnpayment.vn/paygate/pay.html?${signData}&vnp_SecureHash=${signature}`

  return {
    success: true,
    paymentUrl,
    transactionId
  }
})

function formatDate(date: Date): string {
  return date.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)
}

import type { H3Event } from 'h3'

function getClientIP(event: H3Event): string {
  const forwarded = getHeader(event, 'x-forwarded-for')
  if (forwarded) {
    // @ts-ignore
    return typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0]
  }
  return event.node.req.socket.remoteAddress || '127.0.0.1'
}
