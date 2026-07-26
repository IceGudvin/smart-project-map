import { readFileSync, existsSync } from 'node:fs';
import { join, relative, basename } from 'node:path';
import { glob } from 'glob';
import type {
  RawParserOutput,
  RawRoute,
  RawHttpCall,
  RawSchema,
  EnvEntry,
} from '@smart-map/shared';

// ─── Routes ──────────────────────────────────────────────────────────────────

// Matches: @router.get("/path"), @app.post("/path"), @router.delete("/path")
const ROUTE_RE =
  /@(?:router|app)\.(get|post|put|patch|delete|head)\s*\(\s*["']([^"']+)["']/gi;

function extractRoutes(filePath: string, src: string): RawRoute[] {
  const routes: RawRoute[] = [];
  let match: RegExpExecArray | null;
  ROUTE_RE.lastIndex = 0;
  while ((match = ROUTE_RE.exec(src)) !== null) {
    const line = src.slice(0, match.index).split('\n').length;
    routes.push({
      method: match[1]!.toUpperCase() as RawRoute['method'],
      path: match[2]!,
      file: filePath,
      line,
    });
  }
  return routes;
}

// ─── HTTP Calls ───────────────────────────────────────────────────────────────

// httpx.get/post/... or requests.get/post/...
const HTTP_CALL_RE =
  /(?:httpx|requests|aiohttp\.ClientSession\(\))\.(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/gi;

function extractHttpCalls(filePath: string, src: string): RawHttpCall[] {
  const calls: RawHttpCall[] = [];
  let match: RegExpExecArray | null;
  HTTP_CALL_RE.lastIndex = 0;
  while ((match = HTTP_CALL_RE.exec(src)) !== null) {
    const line = src.slice(0, match.index).split('\n').length;
    calls.push({
      method: match[1]!.toUpperCase() as RawHttpCall['method'],
      url: match[2]!,
      file: filePath,
      line,
    });
  }
  return calls;
}

// ─── Schemas (Pydantic v2) ────────────────────────────────────────────────────

// class SomeName(BaseModel): followed by field: type lines
const CLASS_RE = /^class\s+(\w+)\s*\([^)]*BaseModel[^)]*\)\s*:/gm;
const FIELD_RE = /^\s{4}(\w+)\s*:\s*([^=\n]+?)(?:\s*=.*)?$/gm;

function extractSchemas(filePath: string, src: string): RawSchema[] {
  const schemas: RawSchema[] = [];
  let classMatch: RegExpExecArray | null;
  CLASS_RE.lastIndex = 0;
  while ((classMatch = CLASS_RE.exec(src)) !== null) {
    const className = classMatch[1]!;
    const classLine = src.slice(0, classMatch.index).split('\n').length;
    const bodyStart = classMatch.index + classMatch[0].length;
    // Extract until next class or end-of-file
    const nextClass = CLASS_RE.exec(src);
    const bodyEnd = nextClass ? nextClass.index : src.length;
    CLASS_RE.lastIndex = classMatch.index + classMatch[0].length; // reset to continue
    const body = src.slice(bodyStart, bodyEnd);

    const fields: RawSchema['fields'] = [];
    FIELD_RE.lastIndex = 0;
    let fieldMatch: RegExpExecArray | null;
    while ((fieldMatch = FIELD_RE.exec(body)) !== null) {
      const name = fieldMatch[1]!;
      const rawType = fieldMatch[2]!.trim();
      // Optional[X] means not required, otherwise required
      const required = !rawType.startsWith('Optional[');
      const type = rawType.replace(/^Optional\[(.+)\]$/, '$1');
      fields.push({ name, type, required });
    }

    if (fields.length > 0) {
      schemas.push({
        name: className,
        fields,
        file: filePath,
        line: classLine,
      });
    }
  }
  return schemas;
}

// ─── Env Config ───────────────────────────────────────────────────────────────

// os.environ["KEY"], os.environ.get("KEY"), os.getenv("KEY")
const ENV_RE =
  /os\.(?:environ(?:\.get)?|getenv)\s*\(\s*["']([A-Z0-9_]+)["']/g;

function extractEnvConfig(filePath: string, src: string): EnvEntry[] {
  const entries: EnvEntry[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  ENV_RE.lastIndex = 0;
  while ((match = ENV_RE.exec(src)) !== null) {
    const key = match[1]!;
    if (!seen.has(key)) {
      seen.add(key);
      const line = src.slice(0, match.index).split('\n').length;
      entries.push({ key, file: filePath, line });
    }
  }
  return entries;
}

// ─── .env file parser ─────────────────────────────────────────────────────────

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
    if (/^[A-Z0-9_]+$/.test(key)) {
      entries.push({ key, file: envPath, line: lineNum });
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
  const envConfig: EnvEntry[] = [];

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
    envConfig.push(...extractEnvConfig(filePath, src));
  }

  // Also parse .env file in root
  envConfig.push(...parseEnvFile(join(rootDir, '.env')));
  // Deduplicate env keys (prefer .env entries)
  const seen = new Set<string>();
  const dedupedEnv = envConfig.filter((e) => {
    if (seen.has(e.key)) return false;
    seen.add(e.key);
    return true;
  });

  const output: RawParserOutput = {
    serviceName: basename(rootDir),
    language: 'python',
    framework: 'fastapi',
    routes,
    httpCalls,
    schemas,
    envConfig: dedupedEnv,
  };

  return [output];
}
