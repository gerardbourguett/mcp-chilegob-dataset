import type { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { getResourceData, getResource, fetchAndParseFile, NotParseableError, CkanHttpError, CkanApiError } from '../ckan.js'

export function registerResourceTool(server: McpServer): void {
  server.registerTool(
    'get_resource_data',
    {
      title: 'Get Resource Data',
      description:
        'Read tabular data from a CKAN resource. Tries the CKAN datastore first; if unavailable, automatically downloads and parses the file (CSV, TSV, JSON). For XLS, PDF and other binary formats it returns the direct download URL. Supports pagination via limit and offset.',
      inputSchema: z.object({
        resource_id: z.string().describe("Resource UUID from a dataset's resources list (use get_dataset to obtain it)"),
        limit: z.number().int().min(1).max(500).default(50).optional().describe('Rows to return (default: 50, max: 500)'),
        offset: z.number().int().min(0).default(0).optional().describe('Row offset for pagination (default: 0)'),
      }),
    },
    async ({ resource_id, limit, offset }) => {
      const effectiveLimit = limit ?? 50
      const effectiveOffset = offset ?? 0

      // Attempt 1: CKAN datastore
      try {
        const result = await getResourceData(resource_id, effectiveLimit, effectiveOffset)
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              source: 'datastore',
              total: result.total,
              returned: result.records.length,
              offset: effectiveOffset,
              fields: result.fields,
              records: result.records,
            }, null, 2),
          }],
        }
      } catch (datastoreError) {
        const isNoDatastore =
          (datastoreError instanceof CkanHttpError && datastoreError.statusCode === 404) ||
          (datastoreError instanceof CkanApiError && datastoreError.errorType.toLowerCase().includes('not found'))

        if (!isNoDatastore) {
          const dsMessage = datastoreError instanceof Error ? datastoreError.message : String(datastoreError)
          return {
            content: [{ type: 'text', text: `Error: ${dsMessage}` }],
            isError: true,
          }
        }
      }

      // Attempt 2: direct file download
      try {
        const resource = await getResource(resource_id)
        const result = await fetchAndParseFile(resource.url, resource.format, effectiveLimit, effectiveOffset)

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              source: 'file',
              format: resource.format,
              url: resource.url,
              total: result.total,
              returned: result.records.length,
              offset: effectiveOffset,
              fields: result.fields,
              records: result.records,
            }, null, 2),
          }],
        }
      } catch (fileError) {
        // Format not parseable — return the URL so the AI can guide the user
        if (fileError instanceof NotParseableError) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                source: 'file',
                parseable: false,
                format: fileError.format,
                url: fileError.url,
                message: `This resource is a ${fileError.format} file and cannot be parsed automatically. Download it directly from the URL above.`,
              }, null, 2),
            }],
          }
        }

        const fileMessage = fileError instanceof Error ? fileError.message : String(fileError)

        return {
          content: [{ type: 'text', text: `Error reading file: ${fileMessage}` }],
          isError: true,
        }
      }
    }
  )
}
