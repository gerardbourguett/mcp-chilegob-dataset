import { McpServer } from '@modelcontextprotocol/server'
import { registerSearchTool } from './tools/search.js'
import { registerDatasetTool } from './tools/dataset.js'
import { registerResourceTool } from './tools/resource.js'

export const server = new McpServer({
  name: 'datos-gob-cl',
  version: '1.0.0',
})

registerSearchTool(server)
registerDatasetTool(server)
registerResourceTool(server)
