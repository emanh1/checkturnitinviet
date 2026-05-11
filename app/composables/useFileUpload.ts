export const useFileUpload = () => {
  const supabase = useSupabaseClient()
  const { profile, fetchProfile } = useUser()
  const { fetchSettings } = useSettings()

  const uploadFile = async (file: File, checkType: 'ai' | 'similarity' | 'combo' = 'combo') => {
    if (!profile.value) throw new Error('User not authenticated')

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ]

    if (!allowedTypes.includes(file.type)) {
      throw new Error('File type not supported')
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File size too large (max 10MB)')
    }
    const settings = await fetchSettings()
    if (!settings) throw new Error('Không thể tải cài đặt hệ thống')

    let creditsRequired = 0

      switch (checkType) {
        case 'ai':
          creditsRequired = settings.ai_credit_cost
          break

        case 'similarity':
          creditsRequired = settings.similarity_credit_cost
          break

        case 'combo':
          creditsRequired = settings.combo_credit_cost
          break
      }

    const currentCredits = profile.value.credits ?? 0

    if (currentCredits < creditsRequired) {
      throw new Error('Không đủ credits')
    }

    const fileExt = file.name.split('.').pop() || 'dat'
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
    const filePath = `documents/${profile.value.id}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    // Save to database
    const { data: docData, error: dbError } = await supabase
      .from('documents')
      .insert({
        user_id: profile.value.id,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type
      })
      .select()
      .single()

    if (dbError) {
      try {
        await supabase.storage.from('documents').remove([filePath])
      } catch {
        // best effort cleanup
      }
      throw dbError
    }

    const { error: creditError } = await supabase
      .from('profiles')
      .update({
        credits: currentCredits - creditsRequired
      })
      .eq('id', profile.value.id)

    if (creditError) {
      try {
        await supabase.from('documents').delete().eq('id', docData.id)
      } catch {
        // best effort cleanup
      }
      try {
        await supabase.storage.from('documents').remove([filePath])
      } catch {
        // best effort cleanup
      }
      throw creditError
    }

    let orderData
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert({
          user_id: profile.value.id,
          document_id: docData.id,
          check_type: checkType,
          status: 'pending'
        })
        .select()
        .single()

      if (error) throw error
      orderData = data
    } catch (error) {
      try {
        await supabase
          .from('profiles')
          .update({ credits: currentCredits })
          .eq('id', profile.value.id)
      } catch {
        // best effort restore credits
      }
      throw error
    }

    await fetchProfile()
    return orderData
  }

  return {
    uploadFile
  }
}