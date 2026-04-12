import { serve } from '@hono/node-server'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/server'
import { createMcpHonoApp } from '@modelcontextprotocol/hono'
import type { Hono } from 'hono'
import { server } from './server.js'

const transport = new WebStandardStreamableHTTPServerTransport({
  sessionIdGenerator: undefined,
})

await server.connect(transport)

type McpVars = { Variables: { parsedBody: unknown } }
const app = createMcpHonoApp() as unknown as Hono<McpVars>
app.all('/mcp', c => transport.handleRequest(c.req.raw, { parsedBody: c.get('parsedBody') }))

serve({ fetch: app.fetch, port: 3000 }, info => {
  console.log(`MCP server running on http://localhost:${info.port}/mcp`)
})
