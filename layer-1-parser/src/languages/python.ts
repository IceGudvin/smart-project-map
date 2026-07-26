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

// Pattern 1: httpx.get(...) / requests.post(...) — direct module-level calls
const HTTP_CALL_DIRECT_RE =
  /(?:httpx|requests)\.(get|post|put|patch|delete)\s*\(\s*(["'`]?)([^"'`),\n]+)\2/gi;

// Pattern 2: await client.post(f"{settings.backend_url}/api/...") — httpx.AsyncClient instance
// Covers patterns seen in Leadway agent/sender.py:
//   async with httpx.AsyncClient() as client:
//       resp = await client.post(f"{settings.backend_url}/api/messages/send", ...)
const HTTP_CALL_CLIENT_RE =
  /\bawait\s+(?:\w+\.)?client\.(get|post|put|patch|delete)\s*\(\s*([f]?["'`])([^"'`\n]{4,})\2/gi;

function extractHttpCalls(filePath: string, src: string): RawHttpCall[] {
  const calls: RawHttpCall[] = [];

  let match: RegExpExecArray | null;

  // Direct: httpx.post("https://..."), requests.get(url)
  HTTP_CALL_DIRECT_RE.lastIndex = 0;
  while ((match = HTTP_CALL_DIRECT_RE.exec(src)) !== null) {
    const method = match[1]!.toUpperCase() as RawHttpCall['method'];
    const url = match[3]!.trim();
    const line = src.slice(0, match.index).split('\n').length;
    calls.push({ method, url, file: filePath, line });
  }

  // Client instance: await client.post(f"{settings.backend_url}/api/...")
  HTTP_CALL_CLIENT_RE.lastIndex = 0;
  while ((match = HTTP_CALL_CLIENT_RE.exec(src)) !== null) {
    const method = match[1]!.toUpperCase() as RawHttpCall['method'];
    const url = match[3]!.trim();
    const line = src.slice(0, match.index).split('\n').length;
    calls.push({ method, url, file: filePath, line });
  }

  return calls;
}

// ─── Redis Calls ──────────────────────────────────────────────────────────────

// Publish: rpush/lpush/xadd/publish with a string queue name
// e.g. await redis.rpush("draft_queue", ...) or await r.rpush("summary_queue", ...)
const REDIS_PUBLISH_RE =
  /\b(?:await\s+)?(?:\w+\.)?(?:redis|r|conn|client)\.(rpush|lpush|xadd|publish)\s*\(\s*["']([^"']+)["']/gi;

// Consume: blpop/brpop/subscribe/xread with a string queue name
// e.g. await redis.blpop("draft_queue") or r.subscribe("events")
const REDIS_CONSUME_RE =
  /\b(?:await\s+)?(?:\w+\.)?(?:redis|r|conn|client)\.(blpop|brpop|subscribe|xread)\s*\(\s*["']([^"']+)["']/gi;

function extractRedisCalls(filePath: string, src: string): RawRedisCall[] {
  const calls: RawRedisCall[] = [];
  let match: RegExpExecArray | null;

  REDIS_PUBLISH_RE.lastIndex = 0;
  while ((match = REDIS_PUBLISH_RE.exec(src)) !== null) {
    const command = match[1]!.toLowerCase();
    const queueName = match[2]!;
    const line = src.slice(0, match.index).split('\n').length;
    calls.push({ queueName, direction: 'publish', command, file: filePath, line });
  }

  REDIS_CONSUME_RE.lastIndex = 0;
  while ((match = REDIS_CONSUME_RE.exec(src)) !== null) {
    const command = match[1]!.toLowerCase();
    const queueName = match[2]!;
    const line = src.slice(0, match.index).split('\n').length;
    calls.push({ queueName, direction: 'consume', command, file: filePath, line });
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
  for (const raw of src.split('\n')) {
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
  const redisCalls: RawRedisCall[] = [];
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
    redisCalls.push(...extractRedisCalls(filePath, src));
    schemas.push(...extractSchemas(filePath, src));
    envConfig.push(...extractEnvConfig(src));
  }

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
    redisCalls,
    schemas,
    envConfig,
    parsedAt: Date.now(),
  }];
}
