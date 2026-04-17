import { createRequire } from 'node:module'
import { McpServer } from '@modelcontextprotocol/server'
import { registerSearchTool } from './tools/search.js'
import { registerDatasetTool } from './tools/dataset.js'
import { registerResourceTool } from './tools/resource.js'
import { registerOrganizationsTool } from './tools/organizations.js'
import { registerSchemaTool } from './tools/schema.js'

const _require = createRequire(import.meta.url)
const { version } = _require('../package.json') as { version: string }

export const server = new McpServer({
  name: 'datos-gob-cl',
  version,
})

registerSearchTool(server)
registerDatasetTool(server)
registerResourceTool(server)
registerOrganizationsTool(server)
registerSchemaTool(server)
