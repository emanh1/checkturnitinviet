import { serverSupabaseClient, serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { z } from "zod"

export default eventHandler(async (event) => {
    const user = await serverSupabaseUser(event)

    if (!user) return null

    const supabase =
        await serverSupabaseClient(event)

    const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.sub).single()

    if (error) {
        throw createError({
            statusCode: 500,
            statusMessage: error.message
        })
    }

    if (profile?.role !== 'admin') return null

    const query = await getValidatedQuery(
        event,
        z.object({
            start: z.string(),
            end: z.string(),
            period: z.enum([
                'daily',
                'weekly',
                'monthly'
            ])
        }).parse
    )

    const { data, error: erro2 } = await supabase
        .from('payments')
        .select('amount, created_at')
        .eq('status', 'completed')
        .gte('created_at', query.start)
        .lte('created_at', query.end)

    if (erro2) {
        throw createError({
            statusCode: 500,
            statusMessage: erro2.message
        })
    }

    return data
})