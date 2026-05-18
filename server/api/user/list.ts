import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server"

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event)

    if (!user) return null

    const client = await serverSupabaseClient(event)

    const { data: profile, error } = await client.from('profiles').select('*').eq('id', user.sub).single()

    if (error) {
        throw createError({
            statusCode: 500,
            statusMessage: error.message
        })
    }

    if (profile?.role !== 'admin') return null

    const { data, error: error2 } = await client.from('profiles').select('*')

    if (error2) {
        throw createError({
            statusCode: 500,
            statusMessage: error2.message
        })
    }

    return data
})