import chokidar, { type FSWatcher } from 'chokidar'
import { runScan } from './scanner.js'
import { broadcastFull, broadcastPatch } from './ws/server.js'

const DEBOUNCE_MS = 400
const IGNORE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /dist/,
  /\.next/,
  /coverage/,
  /\.turbo/,
]

let _debounceTimer: ReturnType<typeof setTimeout> | null = null
let _watcher: FSWatcher | null = null

/**
 * Останавливает текущий watcher (если есть) и сбрасывает debounce-таймер.
 * Нужно вызывать перед startWatcher() при смене projectDir.
 */
export function stopWatcher(): void {
  if (_debounceTimer) { clearTimeout(_debounceTimer); _debounceTimer = null }
  if (_watcher) {
    void _watcher.close().catch((err) => console.error('[watcher] close error:', err))
    _watcher = null
  }
}

export function startWatcher(projectDir: string): void {
  stopWatcher() // гарантируем, что предыдущий уже закрыт

  _watcher = chokidar.watch(projectDir, {
    ignored: (path: string) => IGNORE_PATTERNS.some((p) => p.test(path)),
    ignoreInitial: true,
    persistent: true,
    usePolling: false,
    awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 },
  })

  const triggerRebuild = (): void => {
    if (_debounceTimer) clearTimeout(_debounceTimer)
    _debounceTimer = setTimeout(async () => {
      console.log('[watcher] change detected — rebuilding graph...')
      try {
        const { graph, diff } = await runScan()
        if (diff) {
          broadcastPatch(diff)
        } else {
          broadcastFull(graph)
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('[watcher] rebuild failed:', message)
      }
    }, DEBOUNCE_MS)
  }

  _watcher
    .on('add', triggerRebuild)
    .on('change', triggerRebuild)
    .on('unlink', triggerRebuild)
    .on('error', (err) => console.error('[watcher] error:', err))
    .on('ready', () => console.log(`[watcher] watching ${projectDir}`))
}
