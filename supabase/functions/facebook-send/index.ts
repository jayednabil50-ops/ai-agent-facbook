import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FB_GRAPH_VERSION = Deno.env.get('FB_GRAPH_VERSION') || 'v24.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type AppSettingRow = { key: string; value: unknown }

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function loadSettings(supabase: ReturnType<typeof createClient>, keys: string[]) {
  const { data, error } = await supabase
    .from('app_settings')
    .select('key,value')
    .in('key', keys)

  if (error) throw new Error(`Failed to load app_settings: ${error.message}`)

  return Object.fromEntries((data || []).map((row: AppSettingRow) => [row.key, row.value]))
}

async function saveSetting(supabase: ReturnType<typeof createClient>, key: string, value: unknown) {
  const { error } = await supabase
    .from('app_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })

  if (error) throw new Error(`Failed to save setting "${key}": ${error.message}`)
}

async function logError(
  supabase: ReturnType<typeof createClient>,
  message: string,
  context?: string,
  stack?: string,
) {
  await supabase
    .from('error_logs')
    .insert({
      type: 'Error',
      message,
      context: context || null,
      stack: stack || null,
    })
    .throwOnError()
}

function buildAttachmentMessage(
  recipientId: string,
  type: 'audio' | 'image' | 'file',
  url: string,
) {
  return {
    recipient: { id: recipientId },
    message: {
      attachment: {
        type,
        payload: { url, is_reusable: true },
      },
    },
    messaging_type: 'RESPONSE',
  }
}

async function sendToFacebook(pageId: string, accessToken: string, body: Record<string, unknown>) {
  const fbRes = await fetch(
    `https://graph.facebook.com/${FB_GRAPH_VERSION}/${pageId}/messages?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )

  const fbData = await fbRes.json().catch(() => ({}))
  if (!fbRes.ok) {
    throw new Error((fbData as any)?.error?.message || `Facebook API ${fbRes.status}`)
  }
  return fbData
}

async function testFacebookCredentials(pageId: string, accessToken: string) {
  const res = await fetch(
    `https://graph.facebook.com/${FB_GRAPH_VERSION}/${pageId}?fields=id,name&access_token=${encodeURIComponent(accessToken)}`,
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as any)?.error?.message || `Facebook API ${res.status}`)
  }
  return data
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    const payload = await req.json().catch(() => ({}))
    const action = (payload.action || '').toString()

    if (!action) {
      return jsonResponse(400, { error: 'Missing action' })
    }

    if (action === 'update_config') {
      const pageId = (payload.pageId || '').toString().trim()
      const pageName = (payload.pageName || 'Facebook Page').toString().trim()
      const webhookUrl = (payload.webhookUrl || '').toString().trim()
      const pageAccessToken = (payload.pageAccessToken || '').toString().trim()
      const verifyToken = (payload.verifyToken || '').toString().trim()

      if (!pageId) return jsonResponse(400, { error: 'pageId is required' })
      if (!webhookUrl) return jsonResponse(400, { error: 'webhookUrl is required' })

      await saveSetting(supabase, 'facebook_page_id', pageId)
      await saveSetting(supabase, 'n8n_webhook_url', webhookUrl)
      await saveSetting(supabase, 'webhook', { messageWebhook: webhookUrl, errorWebhook: '' })

      if (pageAccessToken) {
        await saveSetting(supabase, 'facebook_page_access_token', pageAccessToken)
      }
      if (verifyToken) {
        await saveSetting(supabase, 'facebook_verify_token', verifyToken)
      }

      const { error: connectionError } = await supabase
        .from('connected_pages')
        .upsert(
          {
            id: '00000000-0000-0000-0000-000000000001',
            page_name: pageName,
            page_id: pageId,
            webhook_url: webhookUrl,
            status: 'connected',
            connected_on: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' },
        )

      if (connectionError) {
        throw new Error(`Failed to save connected_pages: ${connectionError.message}`)
      }

      return jsonResponse(200, {
        success: true,
        pageId,
        pageName,
        hasAccessToken: pageAccessToken.length > 0,
      })
    }

    const overrides = {
      pageId: (payload.pageId || '').toString().trim(),
      pageAccessToken: (payload.pageAccessToken || '').toString().trim(),
    }

    const settings = await loadSettings(supabase, [
      'facebook_page_id',
      'facebook_page_access_token',
    ])

    const pageId = overrides.pageId || (settings.facebook_page_id || '').toString().trim()
    const accessToken = overrides.pageAccessToken || (settings.facebook_page_access_token || '').toString().trim()

    if (!pageId || !accessToken) {
      return jsonResponse(400, {
        error: 'Facebook page config missing. Save page ID and access token first.',
      })
    }

    if (action === 'test_connection') {
      const pageData = await testFacebookCredentials(pageId, accessToken)

      await supabase
        .from('connected_pages')
        .upsert({
          id: '00000000-0000-0000-0000-000000000001',
          status: 'connected',
          page_name: (pageData as any)?.name || 'Facebook Page',
          page_id: pageId,
          connected_on: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })
        .throwOnError()

      return jsonResponse(200, { success: true, page: pageData })
    }

    const recipientId = (payload.recipientId || '').toString().trim()
    const conversationId = (payload.conversationId || '').toString().trim()
    if (!recipientId) return jsonResponse(400, { error: 'recipientId is required' })

    let fbBody: Record<string, unknown>

    if (action === 'send_text') {
      const content = (payload.content || '').toString()
      if (!content.trim()) return jsonResponse(400, { error: 'content is required' })
      fbBody = {
        recipient: { id: recipientId },
        message: { text: content },
        messaging_type: 'RESPONSE',
      }
    } else if (action === 'send_audio') {
      const audioUrl = (payload.audioUrl || '').toString().trim()
      if (!audioUrl) return jsonResponse(400, { error: 'audioUrl is required' })
      fbBody = buildAttachmentMessage(recipientId, 'audio', audioUrl)
    } else if (action === 'send_image') {
      const imageUrl = (payload.imageUrl || '').toString().trim()
      if (!imageUrl) return jsonResponse(400, { error: 'imageUrl is required' })
      fbBody = buildAttachmentMessage(recipientId, 'image', imageUrl)
    } else if (action === 'send_file') {
      const fileUrl = (payload.fileUrl || '').toString().trim()
      if (!fileUrl) return jsonResponse(400, { error: 'fileUrl is required' })
      fbBody = buildAttachmentMessage(recipientId, 'file', fileUrl)
    } else {
      return jsonResponse(400, { error: 'Invalid action' })
    }

    const fbData = await sendToFacebook(pageId, accessToken, fbBody)
    return jsonResponse(200, { success: true, data: fbData, conversationId })
  } catch (error: any) {
    console.error('facebook-send error:', error)
    try {
      await logError(
        supabase,
        error?.message || 'facebook-send failed',
        'facebook-send',
        error?.stack,
      )
    } catch (logErr) {
      console.error('facebook-send logError failed:', logErr)
    }
    return jsonResponse(500, { error: error?.message || 'Internal server error' })
  }
})
