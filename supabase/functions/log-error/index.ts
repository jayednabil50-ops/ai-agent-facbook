import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' })
  }

  try {
    const payload = await req.json().catch(() => ({}))
    const type = (payload.type || 'Error').toString()
    const message = (payload.message || '').toString().trim()
    const context = (payload.context || '').toString().trim()
    const stack = (payload.stack || '').toString().trim()

    if (!message) return jsonResponse(400, { error: 'message is required' })

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    await supabase
      .from('error_logs')
      .insert({
        type,
        message,
        context: context || null,
        stack: stack || null,
      })
      .throwOnError()

    return jsonResponse(200, { success: true })
  } catch (error: any) {
    console.error('log-error function error:', error)
    return jsonResponse(500, { error: error?.message || 'Internal server error' })
  }
})
