import { readFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { glob } from 'glob';
import type {
  RawParserOutput,
  RawRoute,
  RawHttpCall,
  RawSchema,
  EnvEntry,
} from '@smart-map/shared';

// ─── Routes ──────────────────────────────────────────────────────────────────

const ROUTE_RE =
  /@(?:router|app)\.(get|post|put|patch|delete|head)\s*\(\s*["']([^"']+)["']/gi;

function extractRoutes(filePath: string, src: string): RawRoute[] {
  const routes: RawRoute[] = [];
  let match: RegExpExecArray | null;
  ROUTE_RE.lastIndex = 0;
  while ((match = ROUTE_RE.exec(src)) !== null) {
    const method = match[1]!.toUpperCase() as RawRoute['method'];
    const path = match[2]!;
    const line = src.slice(0, match.index).split('\n').length;
    routes.push({ method, path, handler: 'unknown', file: filePath, line });
  }
  return routes;
}

// ─── HTTP Calls ───────────────────────────────────────────────────────────────

const HTTP_CALL_RE =
  /(?:httpx|requests)\.(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/gi;

function extractHttpCalls(filePath: string, src: string): RawHttpCall[] {
  const calls: RawHttpCall[] = [];
  let match: RegExpExecArray | null;
  HTTP_CALL_RE.lastIndex = 0;
  while ((match = HTTP_CALL_RE.exec(src)) !== null) {
    const method = match[1]!.toUpperCase() as RawHttpCall['method'];
    const url = match[2]!;
    const line = src.slice(0, match.index).split('\n').length;
    calls.push({ method, url, file: filePath, line });
  }
  return calls;
}

// ─── Schemas (Pydantic v2) ────────────────────────────────────────────────────

const CLASS_RE = /^class\s+(\w+)\s*\([^)]*BaseModel[^)]*\)\s*:/gm;
const FIELD_RE = /^\s{4}(\w+)\s*:\s*([^=\n]+?)(?:\s*=.*)?$/gm;

function extractSchemas(filePath: string, src: string): RawSchema[] {
  const schemas: RawSchema[] = [];
  const classMatches: Array<{ name: string; line: number; bodyStart: number }> = [];

  let cm: RegExpExecArray | null;
  CLASS_RE.lastIndex = 0;
  while ((cm = CLASS_RE.exec(src)) !== null) {
    classMatches.push({
      name: cm[1]!,
      line: src.slice(0, cm.index).split('\n').length,
      bodyStart: cm.index + cm[0].length,
    });
  }

  for (let i = 0; i < classMatches.length; i++) {
    const { name, line, bodyStart } = classMatches[i]!;
    const bodyEnd = i + 1 < classMatches.length
      ? classMatches[i + 1]!.bodyStart
      : src.length;
    const body = src.slice(bodyStart, bodyEnd);

    const fields: RawSchema['fields'] = [];
    FIELD_RE.lastIndex = 0;
    let fm: RegExpExecArray | null;
    while ((fm = FIELD_RE.exec(body)) !== null) {
      const fieldName = fm[1]!;
      const rawType = fm[2]!.trim();
      const required = !rawType.startsWith('Optional[');
      const type = rawType.replace(/^Optional\[(.+)\]$/, '$1');
      fields.push({ name: fieldName, type, required });
    }

    if (fields.length > 0) {
      schemas.push({ name, fields, file: filePath, line });
    }
  }
  return schemas;
}

// ─── Env Config ───────────────────────────────────────────────────────────────

const ENV_RE =
  /os\.(?:environ(?:\.get)?|getenv)\s*\(\s*["']([A-Z0-9_]+)["']/g;

function extractEnvConfig(src: string): EnvEntry[] {
  const entries: EnvEntry[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  ENV_RE.lastIndex = 0;
  while ((match = ENV_RE.exec(src)) !== null) {
    const key = match[1]!;
    if (!seen.has(key)) {
      seen.add(key);
      entries.push({ key, value: '' });
    }
  }
  return entries;
}

function parseEnvFile(envPath: string): EnvEntry[] {
  if (!existsSync(envPath)) return [];
  const src = readFileSync(envPath, 'utf-8');
  const entries: EnvEntry[] = [];
  let lineNum = 0;
  for (const raw of src.split('\n')) {
    lineNum++;
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    const value = line.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (/^[A-Z0-9_]+$/.test(key)) {
      entries.push({ key, value });
    }
  }
  return entries;
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export async function parsePythonProject(
  rootDir: string,
): Promise<RawParserOutput[]> {
  const pyFiles = await glob('**/*.py', {
    cwd: rootDir,
    ignore: ['**/__pycache__/**', '**/migrations/**', '**/.venv/**', '**/venv/**'],
    absolute: true,
  });

  const routes: RawRoute[] = [];
  const httpCalls: RawHttpCall[] = [];
  const schemas: RawSchema[] = [];
  let envConfig: EnvEntry[] = [];

  for (const filePath of pyFiles) {
    let src: string;
    try {
      src = readFileSync(filePath, 'utf-8');
    } catch {
      console.warn(`[layer-1-parser/python] Cannot read: ${filePath}`);
      continue;
    }
    routes.push(...extractRoutes(filePath, src));
    httpCalls.push(...extractHttpCalls(filePath, src));
    schemas.push(...extractSchemas(filePath, src));
    envConfig.push(...extractEnvConfig(src));
  }

  // .env file values take precedence
  const envFromFile = parseEnvFile(join(rootDir, '.env'));
  const seen = new Set<string>(envFromFile.map((e) => e.key));
  envConfig = [
    ...envFromFile,
    ...envConfig.filter((e) => !seen.has(e.key)),
  ];

  return [{
    servicePath: rootDir,
    language: 'python',
    framework: 'fastapi',
    routes,
    httpCalls,
    schemas,
    envConfig,
    parsedAt: Date.now(),
  }];
}
