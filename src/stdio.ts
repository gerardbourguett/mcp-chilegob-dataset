#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/server'
import { server } from './server.js'

const transport = new StdioServerTransport()
await server.connect(transport)
