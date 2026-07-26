import { join } from 'node:path';
import { existsSync, realpathSync } from 'node:fs';
import type { RawParserOutput } from '@smart-map/shared';
import { parseTypeScriptProject } from './languages/typescript.js';
import { parsePythonProject } from './languages/python.js';

export type { RawParserOutput } from '@smart-map/shared';

/**
 * Normalize the path to an absolute, real path.
 * On Windows, Node.js may receive garbled non-ASCII paths depending on
 * how the string was passed across process boundaries.
 * realpathSync resolves symlinks AND re-encodes the path using the OS native API,
 * which fixes Cyrillic/Unicode directory names on Windows.
 */
function normalizePath(inputPath: string): string {
  try {
    return realpathSync(inputPath)
  } catch {
    // If realpathSync fails (path doesn't exist yet), fall back to the input
    return inputPath
  }
}

function detectLanguage(rootDir: string): 'typescript' | 'python' | 'unknown' {
  if (
    existsSync(join(rootDir, 'tsconfig.json')) ||
    existsSync(join(rootDir, 'package.json'))
  ) {
    return 'typescript';
  }
  if (
    existsSync(join(rootDir, 'pyproject.toml')) ||
    existsSync(join(rootDir, 'requirements.txt')) ||
    existsSync(join(rootDir, 'setup.py'))
  ) {
    return 'python';
  }
  return 'unknown';
}

export async function parseProject(
  rootDir: string,
): Promise<RawParserOutput[]> {
  const resolvedDir = normalizePath(rootDir)
  const lang = detectLanguage(resolvedDir);

  if (lang === 'typescript') {
    return parseTypeScriptProject(resolvedDir);
  }
  if (lang === 'python') {
    return parsePythonProject(resolvedDir);
  }

  console.warn(`[layer-1-parser] Unknown language in: ${resolvedDir}`);
  return [];
}
