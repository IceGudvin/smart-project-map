import './styles/index.css'
import { initStore } from './store'
import { AppShell } from './components/AppShell'
import { wsClient } from './lib/wsClient'
import { eventBus } from './lib/eventBus'
import type { GraphData } from '../../shared/types'

/**
 * Точка входа layer-4-ui.
 * Порядок инициализации:
 *   1. store — реактивное состояние
 *   2. AppShell — монтирование UI в #app
 *   3. wsClient — подключение к layer-3-server по WS
 *   4. eventBus — подписка на graph:update → обновление store
 */

async function bootstrap(): Promise<void> {
  const store = initStore()

  const shell = new AppShell(document.getElementById('app')!, store)
  shell.mount()

  wsClient.connect(import.meta.env.VITE_WS_URL ?? 'ws://localhost:3000')

  eventBus.on('graph:update', (data: GraphData) => {
    store.setGraph(data)
    shell.refresh()
  })

  eventBus.on('ws:error', (err: unknown) => {
    console.error('[layer-4-ui] WebSocket error', err)
  })
}

bootstrap()
