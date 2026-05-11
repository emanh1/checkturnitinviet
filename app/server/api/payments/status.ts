import { serverSupabaseUser } from "#supabase/server"
import { z } from "zod"

export default eventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const { transactionId } = await getValidatedQuery(
    event,
    z.object({
      transactionId: z
        .string()
        .min(1)
        .max(100)
        .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid transaction ID')
    }).parse
  )

  const supabase = useSupabaseClient()

  const { data: payment, error } = await supabase
    .from('payments')
    .select('*')
    .eq('transaction_id', transactionId)
    .eq('user_id', user.id)
    .single()

  if (error || !payment) {
    throw createError({
      statusCode: 404,
      message: 'Payment not found'
    })
  }

  return {
    transactionId: payment.transaction_id,
    status: payment.status,
    amount: payment.amount,
    creditsAdded: payment.credits_added,
    createdAt: payment.created_at
  }
})
