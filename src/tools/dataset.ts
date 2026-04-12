import type { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { getDataset } from '../ckan.js'

export function registerDatasetTool(server: McpServer): void {
  server.registerTool(
    'get_dataset',
    {
      title: 'Get Dataset',
      description: 'Get full metadata for a dataset from datos.gob.cl by its ID or slug. Use search_datasets first to find the ID.',
      inputSchema: z.object({
        id: z.string().describe('Dataset slug or UUID (e.g., "nombre-del-dataset" or a UUID from search results)'),
      }),
    },
    async ({ id }) => {
      try {
        const dataset = await getDataset(id)
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              id: dataset.name,
              title: dataset.title,
              description: dataset.notes,
              organization: dataset.organization?.title ?? null,
              license: dataset.license_title,
              tags: dataset.tags.map(t => t.name),
              resources: dataset.resources.map(r => ({
                id: r.id,
                name: r.name,
                format: r.format,
                url: r.url,
                datastore_available: r.datastore_active,
              })),
            }, null, 2),
          }],
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        const isNotFound = message.toLowerCase().includes('not found')
        return {
          content: [{ type: 'text', text: isNotFound ? `Dataset not found: ${id}` : `Error: ${message}` }],
          isError: true,
        }
      }
    }
  )
}
