import type { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { searchDatasets } from '../ckan.js'

export function registerSearchTool(server: McpServer): void {
  server.registerTool(
    'search_datasets',
    {
      title: 'Search Datasets',
      description: 'Search for datasets in the Chilean government open data portal (datos.gob.cl). Returns a list of matching datasets with their IDs, titles, and resource counts.',
      inputSchema: z.object({
        query: z.string().describe('Search query in Spanish or English (e.g., "educación", "salud", "transporte")'),
        limit: z.number().int().min(1).max(100).default(10).optional().describe('Max number of results (default: 10, max: 100)'),
      }),
    },
    async ({ query, limit }) => {
      try {
        const datasets = await searchDatasets(query, limit ?? 10)
        const formatted = datasets.map(d => ({
          id: d.name,
          title: d.title,
          description: d.notes?.slice(0, 200) ?? '',
          organization: d.organization?.title ?? 'N/A',
          resource_count: d.num_resources,
        }))
        return {
          content: [{ type: 'text', text: JSON.stringify(formatted, null, 2) }],
        }
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        }
      }
    }
  )
}
