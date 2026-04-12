import type { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { getResourceData } from '../ckan.js'

export function registerResourceTool(server: McpServer): void {
  server.registerTool(
    'get_resource_data',
    {
      title: 'Get Resource Data',
      description: 'Read tabular data from a CKAN resource. Only works for resources with datastore enabled (check datastore_available from get_dataset). Supports pagination via limit and offset.',
      inputSchema: z.object({
        resource_id: z.string().describe('Resource UUID from a dataset\'s resources list (use get_dataset to obtain it)'),
        limit: z.number().int().min(1).max(500).default(50).optional().describe('Rows to return (default: 50, max: 500)'),
        offset: z.number().int().min(0).default(0).optional().describe('Row offset for pagination (default: 0)'),
      }),
    },
    async ({ resource_id, limit, offset }) => {
      try {
        const result = await getResourceData(resource_id, limit ?? 50, offset ?? 0)
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              total: result.total,
              returned: result.records.length,
              offset: offset ?? 0,
              fields: result.fields,
              records: result.records,
            }, null, 2),
          }],
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        const isNoDatastore = message.toLowerCase().includes('datastore') || message.includes('404') || message.includes('NOT FOUND')
        return {
          content: [{
            type: 'text',
            text: isNoDatastore
              ? `Datastore not available for resource "${resource_id}". This resource may be a file (CSV, XLS, PDF) without an activated datastore. Use the resource URL from get_dataset to download it directly.`
              : `Error: ${message}`,
          }],
          isError: true,
        }
      }
    }
  )
}
