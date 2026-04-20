// Vector + exact-name hybrid search for products and document chunks.
// Body:
// {
//   query: string,
//   query_embedding?: number[],
//   k_products?: number,
//   k_chunks?: number,
//   threshold?: number,
//   strict_product_match?: boolean,
//   target?: "auto" | "product" | "doc",
//   skip_vector_when_exact?: boolean,
//   max_context_chars?: number,
//   max_chunk_chars?: number
// }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const EMBED_MODEL = 'text-embedding-3-small'

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max)
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u0980-\u09ff\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function keywordTokens(value: string) {
  const stop = new Set([
    'the', 'and', 'for', 'with', 'this', 'that', 'from', 'have', 'your',
    'you', 'are', 'about', 'what', 'which', 'how', 'can', 'will', 'where',
    'price', 'product', 'details',
  ])
  return normalizeText(value)
    .split(' ')
    .filter((token) => token.length > 2 && !stop.has(token))
}

function isValidEmbeddingInput(value: unknown): value is number[] {
  return Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === 'number' && Number.isFinite(v))
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

async function embedQuery(query: string, apiKey: string, baseUrl: string): Promise<number[]> {
  const res = await fetch(`${baseUrl}/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: EMBED_MODEL, input: query }),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Embedding API ${res.status}: ${errText.slice(0, 300)}`)
  }
  const json = await res.json()
  const vec = json?.data?.[0]?.embedding
  if (!Array.isArray(vec)) throw new Error('Invalid embedding response')
  return vec
}

async function findExactProductMatches(supabase: any, query: string, limit: number) {
  const normalizedQuery = normalizeText(query)
  if (!normalizedQuery) return []

  const { data, error } = await supabase
    .from('products')
    .select('id,name,category,price,capacity,burner_size,height,includes,material,fan_type,image_url,video_url')
    .not('name', 'is', null)
    .limit(1000)

  if (error) throw new Error(`Failed to load products for exact match: ${error.message}`)

  const rows = (data || []) as any[]
  return rows
    .map((row) => ({ ...row, normalizedName: normalizeText(row.name || '') }))
    .filter((row) => row.normalizedName && normalizedQuery.includes(row.normalizedName))
    .sort((a, b) => b.normalizedName.length - a.normalizedName.length)
    .slice(0, limit)
    .map(({ normalizedName: _ignore, ...rest }) => rest)
}

function rerankChunksByKeywords(query: string, chunks: any[]) {
  const tokens = keywordTokens(query)
  if (tokens.length === 0) return chunks

  return [...chunks]
    .map((chunk) => {
      const text = normalizeText(chunk.content || '')
      const hits = tokens.reduce((score, token) => score + (text.includes(token) ? 1 : 0), 0)
      return { ...chunk, keyword_hits: hits }
    })
    .sort((a, b) => {
      if (b.keyword_hits !== a.keyword_hits) return b.keyword_hits - a.keyword_hits
      return (b.similarity || 0) - (a.similarity || 0)
    })
}

function mergeProducts(exactProducts: any[], vectorProducts: any[], limit: number, strictProductMatch: boolean) {
  if (exactProducts.length > 0 && strictProductMatch) return exactProducts.slice(0, limit)

  const merged = [...exactProducts]
  const seen = new Set(exactProducts.map((p) => p.id))

  for (const row of vectorProducts) {
    if (seen.has(row.id)) continue
    merged.push(row)
    seen.add(row.id)
    if (merged.length >= limit) break
  }

  return merged.slice(0, limit)
}

function formatContext(products: any[], chunks: any[], maxContextChars: number, maxChunkChars: number): string {
  const lines: string[] = []
  let used = 0

  const pushLine = (line: string) => {
    if (!line) return
    const next = used + line.length + 1
    if (next > maxContextChars) return
    lines.push(line)
    used = next
  }

  if (products.length) {
    pushLine('### Relevant Products')
    for (const p of products) {
      const bits = [
        p.name && `**${p.name}**`,
        p.category && `(${p.category})`,
        p.price != null && `- BDT ${p.price}`,
      ].filter(Boolean).join(' ')
      pushLine(`- ${bits}`)

      const det = [
        p.capacity && `capacity ${p.capacity}`,
        p.burner_size && `burner ${p.burner_size}`,
        p.height && `height ${p.height}`,
        p.material && `material ${p.material}`,
        p.fan_type && `fan ${p.fan_type}`,
        p.includes && `includes: ${p.includes}`,
      ].filter(Boolean).join('; ')
      if (det) pushLine(`  ${det}`)
    }
  }

  if (chunks.length) {
    if (lines.length) pushLine('')
    pushLine('### Relevant Information')
    for (const c of chunks) {
      const content = (c.content || '').toString().replace(/\s+/g, ' ').trim()
      if (!content) continue
      const snippet = content.length > maxChunkChars
        ? `${content.slice(0, maxChunkChars)}...`
        : content
      pushLine(`- ${snippet}`)
    }
  }

  return lines.join('\n')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const body = await req.json().catch(() => ({}))

    const query = (body.query || '').toString().trim()
    if (!query) {
      return new Response(JSON.stringify({ error: 'query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const k_products = clamp(body.k_products ?? 5, 0, 20)
    const k_chunks = clamp(body.k_chunks ?? 5, 0, 20)
    const threshold = clamp(body.threshold ?? 0.3, 0, 1)
    const strictProductMatch = body.strict_product_match !== false
    const target = (body.target || 'auto').toString().toLowerCase()
    const searchProducts = target !== 'doc'
    const searchDocs = target !== 'product'
    const skipVectorWhenExact = body.skip_vector_when_exact !== false
    const maxContextChars = clamp(body.max_context_chars ?? 3500, 500, 12000)
    const maxChunkChars = clamp(body.max_chunk_chars ?? 450, 100, 1200)

    const exactProducts = (searchProducts && k_products > 0)
      ? await findExactProductMatches(supabase, query, k_products)
      : []

    const shouldVectorProducts = searchProducts
      && k_products > 0
      && !(strictProductMatch && skipVectorWhenExact && exactProducts.length > 0)
    const shouldVectorDocs = searchDocs && k_chunks > 0
    const needsEmbeddingQuery = shouldVectorProducts || shouldVectorDocs

    let vectorProducts: any[] = []
    let chunkCandidates: any[] = []
    let embeddingError: string | null = null
    let vectorQueryFailed = false

    if (needsEmbeddingQuery) {
      try {
        const queryEmbeddingFromBody = body.query_embedding
        const queryVec = isValidEmbeddingInput(queryEmbeddingFromBody)
          ? queryEmbeddingFromBody
          : await (async () => {
              const { apiKey, baseUrl } = await getProviderConfig(supabase)
              return embedQuery(query, apiKey, baseUrl)
            })()

        const [vectorProductsRes, chunksRes] = await Promise.all([
          shouldVectorProducts
            ? supabase.rpc('match_products', {
                query_embedding: queryVec as any,
                match_count: k_products,
                similarity_threshold: threshold,
              })
            : Promise.resolve({ data: [], error: null }),
          shouldVectorDocs
            ? supabase.rpc('match_document_chunks', {
                query_embedding: queryVec as any,
                match_count: k_chunks * 2,
                similarity_threshold: threshold,
              })
            : Promise.resolve({ data: [], error: null }),
        ])

        if (vectorProductsRes.error) throw new Error(`match_products: ${vectorProductsRes.error.message}`)
        if (chunksRes.error) throw new Error(`match_document_chunks: ${chunksRes.error.message}`)

        vectorProducts = vectorProductsRes.data || []
        chunkCandidates = chunksRes.data || []
      } catch (e: any) {
        embeddingError = e.message || 'Embedding query failed'
        vectorQueryFailed = true
      }
    }

    const finalProducts = mergeProducts(exactProducts, vectorProducts, k_products, strictProductMatch)
    const rerankedChunks = rerankChunksByKeywords(query, chunkCandidates)
    const finalChunks = rerankedChunks.slice(0, k_chunks)

    const context = formatContext(finalProducts, finalChunks, maxContextChars, maxChunkChars)
    const productMatchMode = exactProducts.length > 0
      ? (vectorProducts.length > 0 ? 'exact_plus_vector' : 'exact_name')
      : 'vector'

    return new Response(JSON.stringify({
      ok: true,
      query,
      products: finalProducts,
      chunks: finalChunks,
      context,
      meta: {
        product_match_mode: productMatchMode,
        strict_product_match: strictProductMatch,
        target,
        embedding_query_used: needsEmbeddingQuery,
        query_embedding_source: isValidEmbeddingInput(body.query_embedding) ? 'request' : 'provider',
        vector_query_failed: vectorQueryFailed,
        embedding_error: embeddingError,
        max_context_chars: maxContextChars,
        max_chunk_chars: maxChunkChars,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('search-rag error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
