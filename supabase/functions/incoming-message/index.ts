import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const contentType = req.headers.get('content-type') || ''

    let facebookId: string
    let contactName: string
    let messageText: string | null = null
    let attachmentType: string | null = null
    let attachmentUrl: string | null = null
    let binaryData: Uint8Array | null = null
    let binaryMime: string | null = null
    let isCarousel = false
    let isFromBot = false
    let templateElements: any[] | null = null
    let messageType = 'text'

    // Handle multipart/form-data (binary files from n8n)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      facebookId = formData.get('facebook_id') as string
      contactName = formData.get('contact_name') as string || 'Unknown'
      messageText = formData.get('content') as string || null
      attachmentType = formData.get('attachment_type') as string || null
      isFromBot = formData.get('is_from_bot') === 'true'

      const templateElementsStr = formData.get('template_elements') as string || null
      if (templateElementsStr) {
        try {
          templateElements = JSON.parse(templateElementsStr)
          isCarousel = true
          messageType = 'carousel'
          attachmentType = 'template'
        } catch { /* ignore parse error */ }
      }

      const isCarouselStr = formData.get('is_carousel') as string
      if (isCarouselStr === 'true') isCarousel = true

      // Check for binary file
      const file = formData.get('file') as File | null
      if (file) {
        binaryData = new Uint8Array(await file.arrayBuffer())
        binaryMime = file.type || 'application/octet-stream'
        if (!attachmentType) {
          if (binaryMime.startsWith('image/')) attachmentType = 'image'
          else if (binaryMime.startsWith('audio/')) attachmentType = 'audio'
          else if (binaryMime.startsWith('video/')) attachmentType = 'video'
          else attachmentType = 'file'
        }
      }
    } else {
      // Handle JSON body
      const body = await req.json()
      facebookId = body.facebook_id
      contactName = body.contact_name || 'Unknown'
      messageText = body.content || null
      attachmentType = body.attachment_type || null
      attachmentUrl = body.attachment_url || null
      isFromBot = body.is_from_bot === true
      isCarousel = body.is_carousel === true

      // Parse template_elements
      if (body.template_elements) {
        if (typeof body.template_elements === 'string') {
          try {
            templateElements = JSON.parse(body.template_elements)
          } catch { /* ignore */ }
        } else if (Array.isArray(body.template_elements)) {
          templateElements = body.template_elements
        }
      }

      // Also try to extract from content if it's a carousel JSON
      if (!templateElements && body.content) {
        try {
          const parsed = JSON.parse(body.content)
          const payload =
            parsed?.attachment?.payload ??
            parsed?.message?.attachment?.payload ??
            parsed?.payload
          if (payload?.template_type === 'generic' && Array.isArray(payload.elements)) {
            templateElements = payload.elements
            isCarousel = true
          }
        } catch { /* not JSON, that's fine */ }
      }

      if (templateElements && templateElements.length > 0) {
        isCarousel = true
        messageType = 'carousel'
        if (!attachmentType) attachmentType = 'template'
      }

      // If URL provided but no attachment_type, try to detect
      if (attachmentUrl && !attachmentType) {
        const lower = attachmentUrl.toLowerCase()
        if (lower.match(/\.(jpg|jpeg|png|gif|webp|bmp)/)) attachmentType = 'image'
        else if (lower.match(/\.(mp3|wav|ogg|webm|m4a|aac)/)) attachmentType = 'audio'
        else if (lower.match(/\.(mp4|mov|avi|mkv)/)) attachmentType = 'video'
        else attachmentType = 'file'
      }

      // If a URL is from Facebook CDN (scontent), download and re-upload
      if (attachmentUrl && (attachmentUrl.includes('fbcdn') || attachmentUrl.includes('scontent'))) {
        try {
          const dlRes = await fetch(attachmentUrl)
          if (dlRes.ok) {
            binaryData = new Uint8Array(await dlRes.arrayBuffer())
            binaryMime = dlRes.headers.get('content-type') || 'application/octet-stream'
            attachmentUrl = null
          }
        } catch (e) {
          console.error('Failed to download from Facebook CDN:', e)
        }
      }
    }

    if (!facebookId) {
      return new Response(JSON.stringify({ error: 'facebook_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Upload binary to Supabase Storage if we have it
    if (binaryData && !attachmentUrl) {
      const ext = binaryMime === 'image/jpeg' ? 'jpg'
        : binaryMime === 'image/png' ? 'png'
        : binaryMime === 'image/gif' ? 'gif'
        : binaryMime === 'image/webp' ? 'webp'
        : binaryMime?.startsWith('audio/') ? 'webm'
        : binaryMime?.startsWith('video/') ? 'mp4'
        : 'bin'

      const bucketName = attachmentType === 'image' ? 'customer-images'
        : attachmentType === 'audio' ? 'voice-messages'
        : 'customer-files'

      const fileName = `${attachmentType}_${facebookId}_${Date.now()}.${ext}`

      await supabase.storage.createBucket(bucketName, { public: true }).catch(() => {})

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, binaryData, { contentType: binaryMime || undefined })

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        return new Response(JSON.stringify({ error: 'Failed to upload file', details: uploadError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(fileName)
      attachmentUrl = urlData.publicUrl
    }

    // Set default content based on attachment/message type
    if (!messageText && isCarousel) {
      messageText = '🎠 Carousel'
    } else if (!messageText && attachmentType) {
      if (attachmentType === 'image') messageText = '📷 Image'
      else if (attachmentType === 'audio') messageText = '🎤 Voice message'
      else if (attachmentType === 'video') messageText = '🎥 Video'
      else messageText = '📎 File'
    }

    if (!messageText) messageText = ''

    // Determine message_type if not carousel
    if (!isCarousel) {
      if (attachmentType === 'image') messageType = 'image'
      else if (attachmentType === 'audio') messageType = 'audio'
      else if (attachmentType === 'video') messageType = 'video'
      else if (attachmentType === 'file') messageType = 'file'
      else messageType = 'text'
    }

    // Find or create conversation
    let conversationId: string

    const { data: existingConvo } = await supabase
      .from('conversations')
      .select('id, unread_count')
      .eq('facebook_id', facebookId)
      .maybeSingle()

    if (existingConvo) {
      conversationId = existingConvo.id
      const nextUnreadCount = isFromBot
        ? (existingConvo.unread_count ?? 0)
        : (existingConvo.unread_count ?? 0) + 1
      await supabase
        .from('conversations')
        .update({
          last_message: messageText,
          last_message_time: new Date().toISOString(),
          unread_count: nextUnreadCount,
          contact_name: contactName,
        })
        .eq('id', conversationId)
    } else {
      const { data: newConvo, error: convoError } = await supabase
        .from('conversations')
        .insert({
          facebook_id: facebookId,
          contact_name: contactName,
          last_message: messageText,
          last_message_time: new Date().toISOString(),
          unread_count: 1,
        })
        .select('id')
        .single()

      if (convoError) throw convoError
      conversationId = newConvo.id
    }

    // Insert message with new fields
    const { data: msgData, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        facebook_id: facebookId,
        contact_name: contactName,
        content: messageText,
        sender: isFromBot ? 'ai' : 'contact',
        attachment_type: attachmentType,
        attachment_url: attachmentUrl,
        is_carousel: isCarousel,
        is_from_bot: isFromBot,
        template_elements: templateElements,
        message_type: messageType,
      })
      .select()
      .single()

    if (msgError) throw msgError

    return new Response(JSON.stringify({
      success: true,
      message_id: msgData.id,
      conversation_id: conversationId,
      attachment_url: attachmentUrl,
      is_carousel: isCarousel,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('incoming-message error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
