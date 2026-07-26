import { join } from 'node:path';
import { existsSync, readdirSync, realpathSync, statSync } from 'node:fs';
import type { RawParserOutput } from '@smart-map/shared';
import { parseTypeScriptProject } from './languages/typescript.js';
import { parsePythonProject } from './languages/python.js';

export type { RawParserOutput } from '@smart-map/shared';

/**
 * Normalize the path to an absolute, real path.
 * realpathSync resolves symlinks AND re-encodes the path using the OS native API,
 * which fixes Cyrillic/Unicode directory names on Windows.
 */
function normalizePath(inputPath: string): string {
  try {
    return realpathSync(inputPath)
  } catch {
    return inputPath
  }
}

type Lang = 'typescript' | 'python' | 'unknown'

function detectLanguage(dir: string): Lang {
  if (
    existsSync(join(dir, 'tsconfig.json')) ||
    existsSync(join(dir, 'package.json'))
  ) return 'typescript'

  if (
    existsSync(join(dir, 'pyproject.toml')) ||
    existsSync(join(dir, 'requirements.txt')) ||
    existsSync(join(dir, 'setup.py'))
  ) return 'python'

  return 'unknown'
}

/**
 * Returns immediate subdirectories of rootDir that look like sub-projects
 * (have a recognisable language marker), skipping hidden dirs and node_modules.
 */
function findSubprojects(rootDir: string): Array<{ dir: string; lang: Lang }> {
  const SKIP = new Set(['node_modules', '.git', '.venv', '__pycache__', 'dist', 'build', '.next', 'out'])
  let entries: string[]
  try {
    entries = readdirSync(rootDir)
  } catch {
    return []
  }

  const result: Array<{ dir: string; lang: Lang }> = []
  for (const name of entries) {
    if (SKIP.has(name) || name.startsWith('.')) continue
    const full = join(rootDir, name)
    try {
      if (!statSync(full).isDirectory()) continue
    } catch { continue }

    const lang = detectLanguage(full)
    if (lang !== 'unknown') {
      result.push({ dir: full, lang })
    }
  }
  return result
}

async function parseSingle(dir: string, lang: Lang): Promise<RawParserOutput[]> {
  if (lang === 'typescript') return parseTypeScriptProject(dir)
  if (lang === 'python')     return parsePythonProject(dir)
  return []
}

export async function parseProject(
  rootDir: string,
): Promise<RawParserOutput[]> {
  const resolvedDir = normalizePath(rootDir)
  const rootLang = detectLanguage(resolvedDir)

  // Обычный проект — маркер найден в корне
  if (rootLang !== 'unknown') {
    console.log(`[layer-1-parser] single project (${rootLang}): ${resolvedDir}`)
    return parseSingle(resolvedDir, rootLang)
  }

  // Монорепо — ищем субпроекты в подпапках (глубина 1)
  const subs = findSubprojects(resolvedDir)
  if (subs.length === 0) {
    console.warn(`[layer-1-parser] Unknown language in: ${resolvedDir}`)
    return []
  }

  console.log(`[layer-1-parser] monorepo detected — ${subs.length} subproject(s): ${subs.map(s => s.dir).join(', ')}`)
  const results = await Promise.all(subs.map(s => parseSingle(s.dir, s.lang)))
  return results.flat()
}
