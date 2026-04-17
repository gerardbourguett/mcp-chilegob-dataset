const CKAN_BASE = 'https://datos.gob.cl/api/3/action'
const FETCH_TIMEOUT_MS = 10_000
const CACHE_TTL_MS = 5 * 60 * 1000

class TTLCache<V> {
  private readonly store = new Map<string, { value: V; expiresAt: number }>()

  get(key: string): V | undefined {
    const entry = this.store.get(key)
    if (entry === undefined) return undefined
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return undefined
    }
    return entry.value
  }

  set(key: string, value: V, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs })
  }
}

export class NotParseableError extends Error {
  constructor(
    public readonly format: string,
    public readonly url: string,
  ) {
    super(`Format not parseable: ${format} (${url})`)
    this.name = 'NotParseableError'
  }
}

export class CkanHttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly statusText: string,
  ) {
    super(`CKAN HTTP error: ${statusCode} ${statusText}`)
    this.name = 'CkanHttpError'
  }
}

export class CkanApiError extends Error {
  constructor(
    message: string,
    public readonly errorType: string,
  ) {
    super(`CKAN API error: ${message}`)
    this.name = 'CkanApiError'
  }
}

export interface CkanDataset {
  id: string
  name: string
  title: string
  notes: string
  organization: { title: string } | null
  resources: CkanResource[]
  tags: { name: string }[]
  license_title: string
  num_resources: number
}

export interface CkanResource {
  id: string
  name: string
  format: string
  url: string
  datastore_active: boolean
}

export interface CkanResourceDetail {
  id: string
  name: string
  format: string
  url: string
  datastore_active: boolean
  mimetype: string | null
  size: number | null
}

export interface CkanDatastoreResult {
  fields: { id: string; type: string }[]
  records: Record<string, unknown>[]
  total: number
  source?: 'datastore' | 'file'
}

async function ckanAction<T>(action: string, params: Record<string, unknown>): Promise<T> {
  const url = new URL(`${CKAN_BASE}/${action}`)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value))
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(url.toString(), { signal: controller.signal })
    if (!response.ok) {
      throw new CkanHttpError(response.status, response.statusText)
    }

    const data = await response.json() as { success: boolean; result: T; error?: { __type: string; message?: string } }
    if (!data.success) {
      const errorType = data.error?.__type ?? 'Unknown Error'
      const message = data.error?.message ?? 'Unknown error'
      throw new CkanApiError(message, errorType)
    }

    return data.result
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Request timed out after ${FETCH_TIMEOUT_MS / 1000}s`)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

export interface CkanOrganization {
  name: string
  title: string
  description: string | null
  package_count: number
}

export interface CkanSearchResult {
  total: number
  results: CkanDataset[]
}

const searchCache = new TTLCache<CkanSearchResult>()
const datasetCache = new TTLCache<CkanDataset>()

export async function searchDatasets(query: string, limit: number = 10): Promise<CkanSearchResult> {
  const key = `search:${query}:${limit}`
  const cached = searchCache.get(key)
  if (cached !== undefined) return cached
  const result = await ckanAction<{ count: number; results: CkanDataset[] }>('package_search', { q: query, rows: limit })
  const value: CkanSearchResult = { total: result.count, results: result.results }
  searchCache.set(key, value, CACHE_TTL_MS)
  return value
}

export async function getDataset(id: string): Promise<CkanDataset> {
  const key = `dataset:${id}`
  const cached = datasetCache.get(key)
  if (cached !== undefined) return cached
  const dataset = await ckanAction<CkanDataset>('package_show', { id })
  datasetCache.set(key, dataset, CACHE_TTL_MS)
  return dataset
}

export async function getResourceData(
  resourceId: string,
  limit: number = 50,
  offset: number = 0
): Promise<CkanDatastoreResult> {
  return ckanAction<CkanDatastoreResult>('datastore_search', {
    resource_id: resourceId,
    limit,
    offset,
  })
}

export async function getResource(resourceId: string): Promise<CkanResourceDetail> {
  return ckanAction<CkanResourceDetail>('resource_show', { id: resourceId })
}

export async function listOrganizations(): Promise<CkanOrganization[]> {
  return ckanAction<CkanOrganization[]>('organization_list', { all_fields: true })
}

export interface CkanFieldSchema {
  id: string
  type: string
  label: string | null
  description: string | null
}

interface RawField {
  id: string
  type: string
  info?: { label?: string; notes?: string }
}

export async function getResourceSchema(resourceId: string): Promise<CkanFieldSchema[]> {
  const result = await ckanAction<{ id: string; fields: RawField[] }>('datastore_info', { id: resourceId })
  return result.fields
    .filter(field => field.id !== '_id')
    .map(field => ({
      id: field.id,
      type: field.type,
      label: field.info?.label ?? null,
      description: field.info?.notes ?? null,
    }))
}

const PARSEABLE_FORMATS = new Set(['CSV', 'TSV', 'JSON'])

function decodeText(buffer: ArrayBuffer, contentType: string): string {
  const charsetMatch = /charset=([^\s;]+)/i.exec(contentType)
  const charset = (charsetMatch?.[1] ?? 'utf-8').replace(/^"|"$/g, '')
  const text = new TextDecoder(charset).decode(buffer)
  if (text.includes('\uFFFD') && charset.toLowerCase() === 'utf-8') {
    return new TextDecoder('iso-8859-1').decode(buffer)
  }
  return text
}

export async function fetchAndParseFile(
  url: string,
  format: string,
  limit: number,
  offset: number
): Promise<CkanDatastoreResult> {
  const normalizedFormat = format.toUpperCase().trim()

  if (!PARSEABLE_FORMATS.has(normalizedFormat)) {
    throw new NotParseableError(normalizedFormat, url)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  let response: Response
  try {
    response = await fetch(url, { signal: controller.signal })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Request timed out after ${FETCH_TIMEOUT_MS / 1000}s`)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
  if (!response.ok) {
    throw new CkanHttpError(response.status, response.statusText)
  }

  if (normalizedFormat === 'JSON') {
    const json = await response.json() as unknown
    const rows: Record<string, unknown>[] = Array.isArray(json)
      ? (json as Record<string, unknown>[])
      : [{ data: json }]

    const page = rows.slice(offset, offset + limit)
    const fields = page.length > 0
      ? Object.keys(page[0]).map(key => ({ id: key, type: 'text' }))
      : []

    return { fields, records: page, total: rows.length, source: 'file' }
  }

  // CSV / TSV
  const buffer = await response.arrayBuffer()
  const contentType = response.headers.get('content-type') ?? ''
  const text = decodeText(buffer, contentType)
  const separator = normalizedFormat === 'TSV' ? '\t' : ','
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '')

  if (lines.length === 0) {
    return { fields: [], records: [], total: 0, source: 'file' }
  }

  const headers = parseDelimitedLine(lines[0], separator)
  const dataLines = lines.slice(1)
  const page = dataLines.slice(offset, offset + limit)

  const records = page.map(line => {
    const values = parseDelimitedLine(line, separator)
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  })

  const fields = headers.map(h => ({ id: h, type: 'text' }))

  return { fields, records, total: dataLines.length, source: 'file' }
}

function parseDelimitedLine(line: string, separator: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === separator && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}
