// Chunk a document and embed each chunk.
// Body: { document_id: string }    OR    { all_pending: true }
// Returns: { ok, document_id, chunks }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const EMBED_MODEL = 'text-embedding-3-small'
const CHUNK_SIZE = 800   // chars
const CHUNK_OVERLAP = 120

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function chunkText(text: string): string[] {
  const clean = (text || '').replace(/\r\n/g, '\n').trim()
  if (!clean) return []
  if (clean.length <= CHUNK_SIZE) return [clean]

  // Split by paragraphs first, then pack into chunks ~CHUNK_SIZE
  const paragraphs = clean.split(/\n\s*\n+/).map(p => p.trim()).filter(Boolean)
  const chunks: string[] = []
  let cur = ''
  for (const p of paragraphs) {
    if ((cur + '\n\n' + p).length <= CHUNK_SIZE) {
      cur = cur ? `${cur}\n\n${p}` : p
    } else {
      if (cur) chunks.push(cur)
      if (p.length <= CHUNK_SIZE) {
        cur = p
      } else {
        // Hard-split a very long paragraph with overlap
        let i = 0
        while (i < p.length) {
          chunks.push(p.slice(i, i + CHUNK_SIZE))
          i += CHUNK_SIZE - CHUNK_OVERLAP
        }
        cur = ''
      }
    }
  }
  if (cur) chunks.push(cur)
  return chunks
}

async function getProviderConfig(supabase: any) {
  const envApiKey = (Deno.env.get('OPENAI_API_KEY') || '').trim()
  const envBaseUrl = (Deno.env.get('OPENAI_BASE_URL') || 'https://api.openai.com/v1')
    .trim()
    .replace(/\/$/, '')
  if (envApiKey) {
    return { apiKey: envApiKey, baseUrl: envBaseUrl }
  }

  const { data, error } = await supabase
    .from('app_settings')
    .select('key,value')
    .in('key', ['openai_api_key', 'openai_base_url'])
  if (error) throw new Error(`Failed to read app_settings: ${error.message}`)
  const map = Object.fromEntries((data || []).map((r: any) => [r.key, r.value]))
  const apiKey = (map.openai_api_key || '').toString().trim()
  const baseUrl = (map.openai_base_url || 'https://api.openai.com/v1').toString().trim().replace(/\/$/, '')
  if (!apiKey) throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY secret or app_settings.openai_api_key.')
  return { apiKey, baseUrl }
}

async function embedBatch(texts: string[], apiKey: string, baseUrl: string): Promise<number[][]> {
  const res = await fetch(`${baseUrl}/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Embedding API ${res.status}: ${errText.slice(0, 300)}`)
  }
  const json = await res.json()
  const arr = json?.data
  if (!Array.isArray(arr)) throw new Error('Invalid embedding response format')
  return arr.map((d: any) => d.embedding as number[])
}

async function embedOneDocument(
  supabase: any,
  doc: any,
  ensureProvider: () => Promise<{ apiKey: string; baseUrl: string }>,
) {
  await supabase.from('documents').update({ embed_status: 'processing', embed_error: null }).eq('id', doc.id)

  const chunks = chunkText(doc.content || '')
  if (chunks.length === 0) {
    await supabase.from('document_chunks').delete().eq('document_id', doc.id)
    await supabase.from('documents').update({
      embed_status: 'ready',
      chunk_count: 0,
      embed_error: null,
      embedded_at: new Date().toISOString(),
    }).eq('id', doc.id)
    return { totalChunks: 0, embeddedChunks: 0 }
  }

  const { data: existingChunks, error: existingErr } = await supabase
    .from('document_chunks')
    .select('chunk_index, content_hash')
    .eq('document_id', doc.id)

  if (existingErr) throw new Error(`Failed to load existing chunks: ${existingErr.message}`)

  const existingByIndex = new Map<number, any>()
  for (const row of (existingChunks || [])) existingByIndex.set(row.chunk_index, row)

  const desired = await Promise.all(chunks.map(async (content, chunkIndex) => ({
    chunkIndex,
    content,
    tokenCount: Math.ceil(content.length / 4),
    contentHash: await sha256Hex(content),
  })))

  const changed = desired.filter((d) => {
    const prev = existingByIndex.get(d.chunkIndex)
    return !prev || prev.content_hash !== d.contentHash
  })

  if (changed.length > 0) {
    const { apiKey, baseUrl } = await ensureProvider()
    const BATCH = 50
    for (let i = 0; i < changed.length; i += BATCH) {
      const slice = changed.slice(i, i + BATCH)
      const vectors = await embedBatch(slice.map((s) => s.content), apiKey, baseUrl)
      const rows = slice.map((item, idx) => ({
        document_id: doc.id,
        chunk_index: item.chunkIndex,
        content: item.content,
        embedding: vectors[idx] as any,
        token_count: item.tokenCount,
        content_hash: item.contentHash,
      }))
      const { error } = await supabase
        .from('document_chunks')
        .upsert(rows, { onConflict: 'document_id,chunk_index' })
      if (error) throw new Error(`Chunk upsert failed: ${error.message}`)
    }
  }

  const { error: staleErr } = await supabase
    .from('document_chunks')
    .delete()
    .eq('document_id', doc.id)
    .gte('chunk_index', desired.length)
  if (staleErr) throw new Error(`Failed to delete stale chunks: ${staleErr.message}`)

  await supabase.from('documents').update({
    embed_status: 'ready',
    chunk_count: desired.length,
    embed_error: null,
    embedded_at: new Date().toISOString(),
  }).eq('id', doc.id)

  return { totalChunks: desired.length, embeddedChunks: changed.length }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const body = await req.json().catch(() => ({}))

    let docs: any[] = []
    if (body.document_id) {
      const { data, error } = await supabase.from('documents').select('*').eq('id', body.document_id).single()
      if (error) throw new Error(`Document not found: ${error.message}`)
      docs = [data]
    } else if (body.all_pending) {
      const { data, error } = await supabase.from('documents').select('*').eq('embed_status', 'pending')
      if (error) throw new Error(error.message)
      docs = data || []
    } else {
      return new Response(JSON.stringify({ error: 'Provide document_id or all_pending:true' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (docs.length === 0) {
      return new Response(JSON.stringify({ ok: true, results: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let providerPromise: Promise<{ apiKey: string; baseUrl: string }> | null = null
    const ensureProvider = () => {
      if (!providerPromise) providerPromise = getProviderConfig(supabase)
      return providerPromise
    }

    const results: { id: string; chunks?: number; embedded_chunks?: number; error?: string }[] = []
    for (const d of docs) {
      try {
        const stat = await embedOneDocument(supabase, d, ensureProvider)
        results.push({ id: d.id, chunks: stat.totalChunks, embedded_chunks: stat.embeddedChunks })
      } catch (e: any) {
        results.push({ id: d.id, error: e.message })
        await supabase.from('documents').update({
          embed_status: 'error', embed_error: e.message, embedded_at: new Date().toISOString(),
        }).eq('id', d.id)
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('embed-document error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
