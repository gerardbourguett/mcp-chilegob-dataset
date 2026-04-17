import type { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { getResourceSchema } from '../ckan.js'

export function registerSchemaTool(server: McpServer): void {
  server.registerTool(
    'get_resource_schema',
    {
      title: 'Get Resource Schema',
      description:
        'Get the column schema (field names, types, and descriptions) for a CKAN datastore resource. Only works for resources that have datastore enabled (datastore_available: true from get_dataset). Use this before reading data to understand the structure.',
      inputSchema: z.object({
        resource_id: z.string().describe('UUID of the resource (from get_dataset)'),
      }),
    },
    async ({ resource_id }) => {
      try {
        const fields = await getResourceSchema(resource_id)
        return {
          content: [{ type: 'text', text: JSON.stringify(fields, null, 2) }],
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
