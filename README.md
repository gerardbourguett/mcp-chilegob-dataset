# mcp-chilegob-dataset

[![npm version](https://img.shields.io/npm/v/mcp-chilegob-dataset.svg)](https://www.npmjs.com/package/mcp-chilegob-dataset)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

> **English summary:** MCP server that exposes Chile's open government data portal ([datos.gob.cl](https://datos.gob.cl)) as tools for AI assistants. Search and read thousands of public datasets from Chilean government institutions — health, education, transport, environment, and more. No API key required.

Servidor MCP que expone el portal de datos abiertos del gobierno de Chile — [datos.gob.cl](https://datos.gob.cl) — como herramientas para asistentes de inteligencia artificial.

Construido con [Hono](https://hono.dev) y el [SDK de TypeScript del Model Context Protocol](https://github.com/modelcontextprotocol/typescript-sdk).

---

## ¿Qué es MCP?

El **Model Context Protocol (MCP)** es un estándar abierto que permite a los asistentes de IA (Claude, etc.) conectarse a herramientas y fuentes de datos externas de manera estructurada y segura. En lugar de copiar datos crudos en una conversación, el asistente llama a una herramienta y recibe resultados estructurados.

## ¿Qué es datos.gob.cl?

[datos.gob.cl](https://datos.gob.cl) es el portal oficial de datos abiertos del gobierno de Chile, impulsado por [CKAN](https://ckan.org). Contiene miles de datasets públicos de instituciones gubernamentales — salud, educación, transporte, medio ambiente, y más. Todos los datos son de acceso público, sin registro ni autenticación.

---

## Instalación y uso rápido

### Con Claude Code (un comando)

```bash
claude mcp add chilegob -- npx -y mcp-chilegob-dataset
```

Eso es todo. El servidor queda registrado globalmente en tu Claude Code. Reinicia la sesión y ya podés usarlo.

---

### Con Claude Desktop

**Paso 1** — Abre la configuración de Claude Desktop.

En Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`
En Windows: `%APPDATA%\Claude\claude_desktop_config.json`

**Paso 2** — Agrega estas líneas:

```json
{
  "mcpServers": {
    "chilegob": {
      "command": "npx",
      "args": ["-y", "mcp-chilegob-dataset"]
    }
  }
}
```

**Paso 3** — Reinicia Claude Desktop. La primera vez descarga el paquete automáticamente.

Eso es todo. Puedes pedirle a Claude cosas como:

> *"Busca datasets sobre educación en datos.gob.cl"*
> *"Muestra los datos del dataset de matrícula universitaria"*
> *"¿Qué datasets de salud hay disponibles?"*

---

## Herramientas disponibles

Este servidor expone tres herramientas que el asistente puede usar automáticamente.

### `search_datasets`

Busca datasets en datos.gob.cl por palabra clave. Devuelve una lista resumida.

**Parámetros:**

| Nombre | Tipo | Requerido | Por defecto | Descripción |
|--------|------|-----------|-------------|-------------|
| `query` | string | ✅ | — | Texto de búsqueda (en español o inglés) |
| `limit` | number | ❌ | 10 | Máximo de resultados (1–100) |

**Ejemplo de respuesta:**

```json
[
  {
    "id": "matricula-en-educacion-superior",
    "title": "Matrícula en Educación Superior",
    "description": "Bases de datos de matrícula en el sistema de educación superior...",
    "organization": "Subsecretaría de Educación",
    "resource_count": 1
  }
]
```

---

### `get_dataset`

Obtiene los metadatos completos de un dataset: descripción, recursos, etiquetas y licencia.

**Parámetros:**

| Nombre | Tipo | Requerido | Descripción |
|--------|------|-----------|-------------|
| `id` | string | ✅ | Slug o UUID del dataset (obtenido de `search_datasets`) |

**Ejemplo de respuesta:**

```json
{
  "id": "matricula-en-educacion-superior",
  "title": "Matrícula en Educación Superior",
  "organization": "Subsecretaría de Educación",
  "license": "Creative Commons Non-Commercial (Any)",
  "tags": ["educación", "educación superior", "matriculas"],
  "resources": [
    {
      "id": "37377aff-6df8-4424-9228-2f44f3e67fcd",
      "name": "Base de datos de matrícula",
      "format": "CSV",
      "url": "https://datosabiertos.mineduc.cl/...",
      "datastore_available": true
    }
  ]
}
```

> Verifica el campo `datastore_available` antes de usar `get_resource_data`. Los recursos sin datastore deben descargarse desde su `url`.

---

### `get_resource_data`

Lee filas tabulares de un recurso CKAN. Intenta primero el datastore y, si no está disponible, descarga y parsea el archivo directamente. Soporta paginación.

**Estrategia de obtención de datos (automática):**

1. **Datastore CKAN** — acceso estructurado y rápido; disponible solo en algunos recursos.
2. **Descarga directa** — si el datastore no está habilitado, la herramienta descarga el archivo y lo parsea en memoria:
   - `CSV` / `TSV` — parseado nativo, devuelve filas y columnas.
   - `JSON` — parseado nativo si el contenido es un array de objetos.
   - `XLS`, `PDF` y otros formatos binarios — no se parsean; se devuelve la URL directa para que el usuario los descargue.

**Parámetros:**

| Nombre | Tipo | Requerido | Por defecto | Descripción |
|--------|------|-----------|-------------|-------------|
| `resource_id` | string | ✅ | — | UUID del recurso (obtenido de `get_dataset`) |
| `limit` | number | ❌ | 50 | Filas a devolver (1–500) |
| `offset` | number | ❌ | 0 | Desplazamiento para paginación |

**Ejemplo de respuesta (datastore):**

```json
{
  "source": "datastore",
  "total": 42,
  "returned": 3,
  "offset": 0,
  "fields": [
    { "id": "Region", "type": "text" },
    { "id": "Provincia", "type": "text" },
    { "id": "Comuna", "type": "text" }
  ],
  "records": [
    { "Region": "COQUIMBO", "Provincia": "ELQUI", "Comuna": "LA SERENA" }
  ]
}
```

**Ejemplo de respuesta (archivo CSV descargado):**

```json
{
  "source": "file",
  "format": "CSV",
  "url": "https://datosabiertos.mineduc.cl/...",
  "total": 1500,
  "returned": 50,
  "offset": 0,
  "fields": [
    { "id": "Region", "type": "text" }
  ],
  "records": [
    { "Region": "METROPOLITANA" }
  ]
}
```

**Ejemplo de respuesta (formato no parseable):**

```json
{
  "source": "file",
  "parseable": false,
  "format": "XLS",
  "url": "https://datosabiertos.mineduc.cl/archivo.xls",
  "message": "This resource is a XLS file and cannot be parsed automatically. Download it directly from the URL provided."
}
```

---

## Para desarrolladores

### Requisitos

- **Node.js 20 o superior**
- **npm**

### Instalación desde el código fuente

```bash
git clone https://github.com/gerardbourguett/mcp-chilegob-dataset.git
cd mcp-chilegob-dataset
npm install
```

### Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia el servidor HTTP en `http://localhost:3000/mcp` con recarga automática |
| `npm run build` | Compila TypeScript a `dist/` |
| `npm start` | Inicia el servidor HTTP desde `dist/` |
| `npm run typecheck` | Verifica tipos sin compilar |

### Probar localmente (MCP Inspector)

Con el servidor corriendo (`npm run dev`), abre otra terminal y ejecuta:

```bash
npx @modelcontextprotocol/inspector
```

Se abre una interfaz web en `http://localhost:6274`. Configura:
- **Transport type**: `Streamable HTTP`
- **URL**: `http://localhost:3000/mcp`

Desde ahí puedes llamar a cualquier herramienta de forma interactiva y ver las respuestas.

### Arquitectura

```
Cliente AI  →  Hono HTTP  →  McpServer  →  CKAN API v3 (datos.gob.cl)
```

```
src/
├── index.ts        # Servidor HTTP (para desarrollo y despliegue remoto)
├── stdio.ts        # Transporte stdio (para npx y Claude Desktop)
├── server.ts       # Instancia McpServer + registro de herramientas
├── ckan.ts         # Cliente tipado para la API CKAN v3
└── tools/
    ├── search.ts   # search_datasets
    ├── dataset.ts  # get_dataset
    └── resource.ts # get_resource_data
```

### Cómo agregar nuevas herramientas

1. Crea `src/tools/tu-herramienta.ts`
2. Impórtala y regístrala en `src/server.ts`

```typescript
// src/tools/tu-herramienta.ts
import type { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'

export function registerTuHerramienta(server: McpServer): void {
  server.registerTool(
    'nombre_herramienta',
    {
      title: 'Nombre visible en el cliente',
      description: 'Descripción clara. El asistente la usa para decidir cuándo llamar esta herramienta.',
      inputSchema: z.object({
        parametro: z.string().describe('Descripción del parámetro'),
      }),
    },
    async ({ parametro }) => {
      // tu lógica aquí
      return {
        content: [{ type: 'text', text: JSON.stringify({ resultado: parametro }) }],
      }
    }
  )
}
```

---

## Limitaciones conocidas

- **Disponibilidad del datastore** — No todos los recursos tienen datastore habilitado en CKAN. `get_resource_data` intenta automáticamente descargar el archivo (CSV, TSV, JSON); los formatos binarios (XLS, PDF) requieren descarga manual desde la URL devuelta.
- **Archivos grandes** — La descarga directa carga el archivo completo en memoria antes de paginar. Para archivos muy grandes (>100 MB) esto puede ser lento o fallar.
- **Encoding** — Los archivos CSV de datos.gob.cl pueden estar en ISO-8859-1 (Latin-1). La herramienta intenta leerlos como UTF-8; si los caracteres aparecen corruptos, descarga el archivo directamente.
- **Caché en memoria (5 min)** — `search_datasets` y `get_dataset` usan caché en memoria con TTL de 5 minutos. `get_resource_data` siempre consulta en vivo. No hay límites de tasa documentados en datos.gob.cl.
- **Timeout de red (10s)** — Todas las solicitudes a datos.gob.cl tienen un timeout de 10 segundos. Si el portal está lento o caído, las herramientas devuelven un error claro en lugar de colgar indefinidamente.
- **Paquetes en alpha** — `@modelcontextprotocol/hono` y `@modelcontextprotocol/server` están en versión alpha.

---

## Contribuciones

Las contribuciones son bienvenidas. Algunas ideas:

- [ ] Herramienta `list_organizations` — listar instituciones disponibles
- [ ] Herramienta `get_resource_schema` — tipos y descripciones de columnas
- [ ] MCP Resources con URI templates (`datos-gob-cl://dataset/{id}`)

Por favor, abre un issue antes de enviar un PR grande.

---

## Licencia

MIT — ver [LICENSE](./LICENSE).
