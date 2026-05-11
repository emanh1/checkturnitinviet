import crypto from 'crypto'

export default eventHandler(async (event) => {
  const config = useRuntimeConfig()
  const supabase = useSupabaseClient()
  const hashSecret = config.vnpayHashSecret

  if (!hashSecret) {
    return { code: '99', message: 'VNPay configuration error' }
  }

  const query = getQuery(event)

  // Extract VNPay response
  const vnpSecureHash = query.vnp_SecureHash as string

  // Create signature from all params except vnp_SecureHash and vnp_SecureHashType
  const sortedParams = Object.keys(query)
    .filter(key => key.startsWith('vnp_') && key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType')
    .sort()
    .reduce((result, key) => {
      result[key] = String(query[key])
      return result
    }, {} as Record<string, string>)

  const signData = Object.keys(sortedParams)
    .map(key => `${key}=${encodeURIComponent(sortedParams[key])}`)
    .join('&')

  // Verify signature
  const hmac = crypto.createHmac('sha512', hashSecret)
  const calculatedHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex')

  if (vnpSecureHash !== calculatedHash) {
    console.error('Invalid VNPay signature')
    return { code: '97', message: 'Invalid signature' }
  }

  const responseCode = query.vnp_ResponseCode as string
  const transactionId = query.vnp_TxnRef as string
  const amount = parseInt(query.vnp_Amount as string)
  const transactionNo = query.vnp_TransactionNo as string
  const bankCode = query.vnp_BankCode as string

  // Get payment record
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('*')
    .eq('transaction_id', transactionId)
    .single()

  if (paymentError || !payment) {
    console.error('Payment not found:', transactionId)
    return { code: '01', message: 'Order not found' }
  }

  // Check if payment was already processed (idempotency)
  if (payment.status === 'completed') {
    return { code: '00', message: 'Payment already processed' }
  }

  if (responseCode === '00') {
    // Verify amount matches
    if (!payment.amount) {
      return { code: '04', message: 'Amount does not match' }
    }
    const expectedAmount = payment.amount * 100 // Convert to cents
    if (amount !== expectedAmount) {
      console.error('Amount mismatch:', { expected: expectedAmount, received: amount })
      return { code: '04', message: 'Amount does not match' }
    }

    try {
      // Update payment status to completed
      const { error: updatePaymentError } = await supabase
        .from('payments')
        .update({
          status: 'completed',
          transaction_no: transactionNo,
          bank_code: bankCode
        })
        .eq('id', payment.id)

      if (updatePaymentError) throw updatePaymentError

      // Add credits to user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', payment.user_id)
        .single()

      const currentCredits = profile?.credits ?? 0
      const newCredits = currentCredits + payment.credits_added

      const { error: updateCreditsError } = await supabase
        .from('profiles')
        .update({ credits: newCredits })
        .eq('id', payment.user_id)

      if (updateCreditsError) throw updateCreditsError

      console.log(`Payment successful: User ${payment.user_id} added ${payment.credits_added} credits`)
      return { code: '00', message: 'Payment successful' }
    } catch (error: unknown) {
      console.error('Error processing payment:', error)
      return { code: '99', message: 'Error processing payment' }
    }
  } else {
    // Payment failed
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'failed'
      })
      .eq('id', payment.id)

    if (updateError) console.error('Error updating failed payment:', updateError)

    return { code: responseCode, message: 'Payment failed' }
  }
})
