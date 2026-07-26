#!/usr/bin/env node
import { realpathSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { watch } from 'chokidar'
import { store, startServer, broadcast } from '@smart-map/layer-3-server'
import type { WsEvent } from '@smart-map/shared'

// ─── Parse & validate CLI arguments ──────────────────────────────────────────

const rawArgs = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const flags = process.argv.slice(2).filter((a) => a.startsWith('--'))
const port = (() => {
  const p = flags.find((f) => f.startsWith('--port='))
  return p ? parseInt(p.split('=')[1] ?? '3001', 10) : 3001
})()

if (rawArgs.length === 0) {
  console.error('Usage: smart-map <path1> [path2...] [--port=3001]')
  console.error('Example: smart-map ./backend ./agent --port=3001')
  process.exit(1)
}

// Normalize paths — resolves symlinks and re-encodes non-ASCII (Cyrillic) on Windows
function normalizePath(p: string): string {
  const abs = resolve(p)
  try {
    return realpathSync(abs)
  } catch {
    return abs
  }
}

const projectPaths = rawArgs.map(normalizePath)

for (const p of projectPaths) {
  if (!existsSync(p)) {
    console.error(`❌  Path does not exist: ${p}`)
    process.exit(1)
  }
}

// ─── Debounce helper ──────────────────────────────────────────────────────────

function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null
  return ((...args: unknown[]) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }) as T
}

// ─── Rebuild graph ────────────────────────────────────────────────────────────

async function rebuild(reason: string): Promise<void> {
  console.log(`🔄  Rebuilding graph (${reason})…`)
  try {
    const diff = await store.rebuild(projectPaths)
    const model = store.get()!
    console.log(`✅  Graph built: ${model.nodes.length} nodes, ${model.edges.length} edges`)

    if (diff === null) {
      const event: WsEvent = { type: 'graph:full', data: model }
      broadcast(event)
    } else {
      const event: WsEvent = { type: 'graph:update', diff, changedAt: Date.now() }
      broadcast(event)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('❌  Rebuild failed:', message)
    const event: WsEvent = { type: 'graph:error', message }
    broadcast(event)
  }
}

const debouncedRebuild = debounce((path: string) => {
  void rebuild(`file changed: ${path}`)
}, 500)

// ─── Start ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('🗺  smart-project-map starting…')
  console.log(`📂  Watching paths:`)
  for (const p of projectPaths) {
    console.log(`    ${p}`)
  }

  // 1. Start Fastify server
  await startServer(port)
  console.log(`🚀  Server running on http://localhost:${port}`)

  // 2. Initial graph build
  await rebuild('initial')

  // 3. Watch for file changes
  const watcher = watch(projectPaths, {
    ignored: [
      '**/node_modules/**',
      '**/__pycache__/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/venv/**',
      '**/.venv/**',
      '**/*.pyc',
    ],
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  })

  watcher
    .on('add', (path) => debouncedRebuild(path))
    .on('change', (path) => debouncedRebuild(path))
    .on('unlink', (path) => debouncedRebuild(path))
    .on('error', (err) => console.error('👁  Watcher error:', err))

  console.log('👁  File watcher active. Press Ctrl+C to stop.')

  // 4. Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋  Shutting down…')
    void watcher.close().then(() => process.exit(0))
  })
}

void main()
