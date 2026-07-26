import type { FastifyInstance } from 'fastify'
import { readdirSync, statSync } from 'node:fs'
import { resolve, join, sep } from 'node:path'
import { homedir } from 'node:os'

interface BrowseQuery { path?: string }

export function registerFsBrowse(app: FastifyInstance): void {
  /**
   * GET /fs/browse?path=<dir>
   * Возвращает список папок в указанном пути.
   * Без path — старт из home-директории.
   */
  app.get<{ Querystring: BrowseQuery }>('/fs/browse', async (req, reply) => {
    const rawPath = req.query.path?.trim() || homedir()
    const dir = resolve(rawPath)

    let entries: { name: string; isDir: boolean }[] = []
    try {
      const items = readdirSync(dir, { withFileTypes: true })
      entries = items
        .filter((d) => {
          // Скрываем скрытые (начинающиеся с .) и системные папки node_modules/.git
          if (d.name.startsWith('.')) return false
          if (!d.isDirectory()) return false
          const skip = ['node_modules', '$Recycle.Bin', 'System Volume Information']
          return !skip.includes(d.name)
        })
        .map((d) => ({ name: d.name, isDir: true }))
        .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    } catch {
      return reply.status(400).send({ ok: false, error: 'Нет доступа к папке' })
    }

    // Родительская папка
    const parts = dir.split(sep).filter(Boolean)
    const parent = parts.length > 1
      ? dir.split(sep).slice(0, -1).join(sep) || sep
      : null

    reply.send({
      ok: true,
      path: dir,
      parent,
      sep,
      breadcrumbs: _buildBreadcrumbs(dir, sep),
      entries,
    })
  })
}

function _buildBreadcrumbs(dir: string, separator: string): { label: string; path: string }[] {
  const parts = dir.split(separator).filter(Boolean)
  const crumbs: { label: string; path: string }[] = []

  if (separator === '/') {
    // Unix: / → home → user → ...
    crumbs.push({ label: '/', path: '/' })
    let accumulated = ''
    for (const p of parts) {
      accumulated += '/' + p
      crumbs.push({ label: p, path: accumulated })
    }
  } else {
    // Windows: C:\ → Users → ...
    let accumulated = ''
    for (const p of parts) {
      accumulated += (accumulated ? separator : '') + p
      crumbs.push({ label: p || separator, path: accumulated + (accumulated.endsWith(':') ? separator : '') })
    }
  }

  return crumbs
}
