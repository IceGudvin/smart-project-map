import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { glob } from 'glob';
import type {
  RawParserOutput,
  RawRoute,
  RawHttpCall,
  RawRedisCall,
  RawSchema,
  EnvEntry,
} from '@smart-map/shared';
import { buildVariableMap, resolveToken } from './variable-resolver.js';

// ─── Routes ──────────────────────────────────────────────────────────────────

const ROUTE_RE =
  /@(?:router|app)\.(get|post|put|patch|delete|head)\s*\(\s*["']([^"']+)["']/gi;

function extractRoutes(filePath: string, src: string): RawRoute[] {
  const routes: RawRoute[] = [];
  let match: RegExpExecArray | null;
  ROUTE_RE.lastIndex = 0;
  while ((match = ROUTE_RE.exec(src)) !== null) {
    const method = match[1]!.toUpperCase() as RawRoute['method'];
    const path   = match[2]!;
    const line   = src.slice(0, match.index).split('\n').length;
    routes.push({ method, path, handler: 'unknown', file: filePath, line });
  }
  return routes;
}

// ─── HTTP Calls ───────────────────────────────────────────────────────────────

const HTTP_DIRECT_RE =
  /(?:httpx|requests)\.(get|post|put|patch|delete)\s*\(\s*(f?["'][^"'\n]{3,}["']|[A-Za-z_][\w.]*)/gi;

const HTTP_CLIENT_RE =
  /await\s+(?:[\w.]+\.)?client\.(get|post|put|patch|delete)\s*\(\s*\n?\s*(f?["'][^"'\n]{3,}["']|[A-Za-z_][\w.]*)/gi;

function extractHttpCalls(
  filePath: string,
  src: string,
  envConfig: EnvEntry[],
): RawHttpCall[] {
  const calls: RawHttpCall[] = [];
  const varMap = buildVariableMap(src, envConfig);
  let match: RegExpExecArray | null;

  HTTP_DIRECT_RE.lastIndex = 0;
  while ((match = HTTP_DIRECT_RE.exec(src)) !== null) {
    const method = match[1]!.toUpperCase() as RawHttpCall['method'];
    const raw    = match[2]!.trim();
    const url    = resolveToken(raw, varMap) ?? raw;
    const line   = src.slice(0, match.index).split('\n').length;
    calls.push({ method, url, file: filePath, line });
  }

  HTTP_CLIENT_RE.lastIndex = 0;
  while ((match = HTTP_CLIENT_RE.exec(src)) !== null) {
    const method = match[1]!.toUpperCase() as RawHttpCall['method'];
    const raw    = match[2]!.trim();
    const url    = resolveToken(raw, varMap) ?? raw;
    const line   = src.slice(0, match.index).split('\n').length;
    calls.push({ method, url, file: filePath, line });
  }

  return calls;
}

// ─── Redis Calls ──────────────────────────────────────────────────────────────

/**
 * Universal Redis detection — resolves both literal and variable queue names.
 *
 * PUBLISH commands: rpush | lpush | xadd | publish
 * CONSUME commands: blpop | brpop | subscribe | xread
 *
 * Filtering pipeline (applied after resolution):
 *   1. Skip Redis namespace keys — contain ":" but NOT "queue" in the name.
 *      These are internal state keys like "agent:{name}:logs".
 *   2. Skip unresolved variable passthrough — after resolveToken(), if the
 *      result still looks like a plain Python identifier (snake_case, no
 *      path separators, no http scheme) AND it does NOT end with a known
 *      queue suffix (_queue, _key that refers to an actual queue), discard.
 *      Examples of skipped: "queue", "queue_name", "dlq_name", "logs_key"
 *      Examples of kept:    "intake_queue", "draft_queue", "classification_queue"
 *   3. Skip obvious log/metrics keys: ends with "_log", "_logs", "_key"
 *      unless the resolved name contains "queue".
 */

const REDIS_CMD_RE =
  /\b(?:await\s+)?(?:[\w.]+\.)(rpush|lpush|xadd|publish|blpop|brpop|subscribe|xread)\s*\(\s*(f?["'][^"'\n]{1,120}["']|[A-Za-z_][\w.]*)/gi;

const PUBLISH_CMDS = new Set(['rpush', 'lpush', 'xadd', 'publish']);
const CONSUME_CMDS = new Set(['blpop', 'brpop', 'subscribe', 'xread']);

/**
 * Returns true if the resolved queue name looks like an unresolved variable.
 * Heuristic: it's a pure snake_case identifier with no "queue" substring.
 *
 * Keep:  "intake_queue", "classification_queue", "summary_queue"  → false
 * Skip:  "queue", "queue_name", "dlq_name", "logs_key", "key"     → true
 */
function isUnresolvedVariable(name: string): boolean {
  // If it contains http scheme or path separator — it's a real value
  if (name.startsWith('http') || name.includes('/')) return false;
  // If it contains "queue" literally — it's a real inter-service queue name
  if (name.includes('queue')) return false;
  // If it looks like a plain identifier (no dots, no spaces, no dashes) — likely unresolved
  if (/^[a-z_][a-z0-9_]*$/.test(name)) return true;
  return false;
}

function extractRedisCalls(
  filePath: string,
  src: string,
  envConfig: EnvEntry[],
): RawRedisCall[] {
  const calls: RawRedisCall[] = [];
  const varMap = buildVariableMap(src, envConfig);
  let match: RegExpExecArray | null;

  REDIS_CMD_RE.lastIndex = 0;
  while ((match = REDIS_CMD_RE.exec(src)) !== null) {
    const command  = match[1]!.toLowerCase();
    const raw      = match[2]!.trim();
    const resolved = resolveToken(raw, varMap) ?? raw;
    const line     = src.slice(0, match.index).split('\n').length;

    // Filter 1: internal Redis namespace keys (contain ":" but not "queue")
    if (resolved.includes(':') && !resolved.includes('queue')) continue;

    // Filter 2: unresolved variable names that don't contain "queue"
    const rawStripped = raw.replace(/^[fF]?["']|["']$/g, '');
    const queueName   = resolved === rawStripped ? rawStripped : resolved;
    if (isUnresolvedVariable(queueName)) continue;

    // Filter 3: log/metrics/state keys
    if (
      (queueName.endsWith('_key') || queueName.endsWith('_log') || queueName.endsWith('_logs')) &&
      !queueName.includes('queue')
    ) continue;

    const direction = PUBLISH_CMDS.has(command) ? 'publish' : 'consume';
    calls.push({ queueName, direction, command, file: filePath, line });
  }

  return calls;
}

// ─── Schemas (Pydantic v2) ────────────────────────────────────────────────────

const CLASS_RE  = /^class\s+(\w+)\s*\([^)]*BaseModel[^)]*\)\s*:/gm;
const FIELD_RE  = /^\s{4}(\w+)\s*:\s*([^=\n]+?)(?:\s*=.*)?$/gm;

function extractSchemas(filePath: string, src: string): RawSchema[] {
  const schemas: RawSchema[] = [];
  const classMatches: Array<{ name: string; line: number; bodyStart: number }> = [];

  let cm: RegExpExecArray | null;
  CLASS_RE.lastIndex = 0;
  while ((cm = CLASS_RE.exec(src)) !== null) {
    classMatches.push({
      name:      cm[1]!,
      line:      src.slice(0, cm.index).split('\n').length,
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
      const rawType   = fm[2]!.trim();
      const required  = !rawType.startsWith('Optional[');
      const type      = rawType.replace(/^Optional\[(.+)\]$/, '$1');
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
  const seen    = new Set<string>();
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
  const src     = readFileSync(envPath, 'utf-8');
  const entries: EnvEntry[] = [];
  for (const raw of src.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    const key   = line.slice(0, eqIdx).trim();
    const value = line.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (/^[A-Z0-9_]+$/.test(key)) entries.push({ key, value });
  }
  return entries;
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export async function parsePythonProject(
  rootDir: string,
): Promise<RawParserOutput[]> {
  const pyFiles = await glob('**/*.py', {
    cwd:      rootDir,
    ignore:   ['**/__pycache__/**', '**/migrations/**', '**/.venv/**', '**/venv/**'],
    absolute: true,
  });

  const routes:     RawRoute[]     = [];
  const httpCalls:  RawHttpCall[]  = [];
  const redisCalls: RawRedisCall[] = [];
  const schemas:    RawSchema[]    = [];
  let   envConfig:  EnvEntry[]     = [];

  const envFromFile = parseEnvFile(join(rootDir, '.env'));
  const envSeen     = new Set<string>(envFromFile.map((e) => e.key));
  let   codeEnv:    EnvEntry[]     = [];

  for (const filePath of pyFiles) {
    let src: string;
    try {
      src = readFileSync(filePath, 'utf-8');
    } catch {
      console.warn(`[layer-1-parser/python] Cannot read: ${filePath}`);
      continue;
    }
    codeEnv.push(...extractEnvConfig(src));
  }

  const mergedEnv: EnvEntry[] = [
    ...envFromFile,
    ...codeEnv.filter((e) => !envSeen.has(e.key)),
  ];

  for (const filePath of pyFiles) {
    let src: string;
    try {
      src = readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }
    routes.push(...extractRoutes(filePath, src));
    httpCalls.push(...extractHttpCalls(filePath, src, mergedEnv));
    redisCalls.push(...extractRedisCalls(filePath, src, mergedEnv));
    schemas.push(...extractSchemas(filePath, src));
    envConfig.push(...extractEnvConfig(src));
  }

  const finalSeen = new Set<string>(envFromFile.map((e) => e.key));
  envConfig = [
    ...envFromFile,
    ...envConfig.filter((e) => !finalSeen.has(e.key)),
  ];

  return [{
    servicePath: rootDir,
    language:    'python',
    framework:   'fastapi',
    routes,
    httpCalls,
    redisCalls,
    schemas,
    envConfig,
    parsedAt:    Date.now(),
  }];
}
