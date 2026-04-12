const CKAN_BASE = 'https://datos.gob.cl/api/3/action'

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

export interface CkanDatastoreResult {
  fields: { id: string; type: string }[]
  records: Record<string, unknown>[]
  total: number
}

async function ckanAction<T>(action: string, params: Record<string, unknown>): Promise<T> {
  const url = new URL(`${CKAN_BASE}/${action}`)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value))
  }

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`CKAN API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json() as { success: boolean; result: T; error?: { message: string } }
  if (!data.success) {
    throw new Error(`CKAN error: ${data.error?.message ?? 'Unknown error'}`)
  }

  return data.result
}

export async function searchDatasets(query: string, limit: number = 10): Promise<CkanDataset[]> {
  const result = await ckanAction<{ results: CkanDataset[] }>('package_search', { q: query, rows: limit })
  return result.results
}

export async function getDataset(id: string): Promise<CkanDataset> {
  return ckanAction<CkanDataset>('package_show', { id })
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
