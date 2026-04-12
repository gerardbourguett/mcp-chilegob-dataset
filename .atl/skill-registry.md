# Skill Registry — mcp
Generated: 2026-04-11

## Project Standards (CLAUDE.md)
- `CLAUDE.md` (root): Personality, language rules (Rioplatense Spanish / English), philosophy, expertise areas
- Skills auto-load table: go-testing (Go TUI), skill-creator (new skills)

## Compact Rules

### Core Conventions
- ESM modules only (`"type": "module"`)
- Strict TypeScript (`strict: true`, `verbatimModuleSyntax: true`)
- Build: `tsc` → `dist/`; Dev: `tsx watch src/index.ts`
- No linter, no formatter, no test runner currently installed
- Type-check: `tsc --noEmit`

### Code Style
- Never `cat`/`grep`/`find`/`sed`/`ls` — use `bat`/`rg`/`fd`/`sd`/`eza`
- Never build after changes
- Never add "Co-Authored-By" to commits; conventional commits only
- Verify technical claims before stating them

## User Skills (Trigger Table)

| Skill | Trigger Context |
|-------|----------------|
| `hono` | imports from `hono` or `hono/*`; Hono routing, middleware, JSX, validation, streaming |
| `nodejs-backend-patterns` | Node.js servers, REST APIs, middleware patterns, error handling, auth |
| `nodejs-best-practices` | Framework selection, async patterns, security, architecture decisions |
| `typescript-advanced-types` | Generics, conditional types, mapped types, utility types, type-safe APIs |
| `claude-api` | imports `anthropic` / `@anthropic-ai/sdk`; Claude API, Anthropic SDK |
| `superpowers:systematic-debugging` | Any bug, test failure, or unexpected behavior |
| `superpowers:test-driven-development` | Implementing any feature or bugfix |
| `superpowers:writing-plans` | Multi-step implementation planning |
| `superpowers:dispatching-parallel-agents` | 2+ independent tasks |
| `superpowers:requesting-code-review` | Completing tasks or major features |
| `sdd-*` | SDD workflow phases (explore, propose, spec, design, tasks, apply, verify, archive) |

## Project Skills
- `.claude/skills/hono/SKILL.md` — Hono web applications
- `.claude/skills/nodejs-backend-patterns/SKILL.md` — Node.js backend patterns
- `.claude/skills/nodejs-best-practices/SKILL.md` — Node.js best practices
- `.claude/skills/typescript-advanced-types/SKILL.md` — TypeScript advanced types

## Convention Files
- `CLAUDE.md` (root) — Project + user conventions

## Notes
- No test runner installed → Strict TDD Mode disabled despite CLAUDE.md marker
- MCP SDK project: `@modelcontextprotocol/sdk` + `@modelcontextprotocol/hono`
- JSX via `hono/jsx` (jsxImportSource in tsconfig)
