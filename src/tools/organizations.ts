import type { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { listOrganizations } from '../ckan.js'

export function registerOrganizationsTool(server: McpServer): void {
  server.registerTool(
    'list_organizations',
    {
      title: 'List Organizations',
      description: 'List all government institutions (organizations) that publish datasets on datos.gob.cl. Use this to discover which institutions have data before searching.',
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const orgs = await listOrganizations()
        const formatted = orgs
          .filter(o => o.package_count > 0)
          .sort((a, b) => b.package_count - a.package_count)
          .map(o => ({
            id: o.name,
            title: o.title,
            description: o.description?.slice(0, 150) ?? '',
            dataset_count: o.package_count,
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
