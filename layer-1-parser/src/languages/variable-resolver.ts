/**
 * Simplified single-file variable tracer.
 *
 * Builds a VariableMap from a Python source file by collecting:
 *  A) Direct string assignments:   queue = "intake_queue"
 *  B) UPPER_CASE constants:         INTAKE_QUEUE = "intake_queue"
 *  C) Dict literal string values    {"queue": "intake_queue", ...}
 *     — stored under BOTH the dict-key ("queue") AND the string value itself
 *     so callers can look up by variable name OR by dict-key name.
 *  D) settings.X / config.X        resolved via EnvEntry[] passed in
 *
 * The map is intentionally shallow — no cross-file resolution, no
 * control-flow merging. Good enough for detecting queue names and URLs
 * that appear as string literals anywhere in the same file.
 */

import type { EnvEntry } from '@smart-map/shared';

export type VariableMap = Map<string, string>;

// ─── A + B: simple assignments  name = "value"  or  NAME = "value" ──────────
const ASSIGN_RE =
  /^[ \t]*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*["']([^"'\n]{1,200})["']/gm;

// ─── C: dict key→value pairs  "key": "value"  or  'key': 'value' ────────────
const DICT_PAIR_RE =
  /["']([A-Za-z_][A-Za-z0-9_]*)["']\s*:\s*["']([^"'\n]{1,200})["']/g;

// ─── D: settings.VARNAME  or  config.VARNAME ─────────────────────────────────
const SETTINGS_REF_RE = /\bsettings\.([A-Za-z_][A-Za-z0-9_]*)\b/g;

/**
 * Build a VariableMap for a single Python source file.
 *
 * @param src       Full source text
 * @param envConfig Resolved env entries from .env + os.environ() calls
 *                  Used to expand  settings.backend_url  →  "http://backend:8000"
 */
export function buildVariableMap(src: string, envConfig: EnvEntry[]): VariableMap {
  const map: VariableMap = new Map();

  // A + B: direct assignments
  let m: RegExpExecArray | null;
  ASSIGN_RE.lastIndex = 0;
  while ((m = ASSIGN_RE.exec(src)) !== null) {
    map.set(m[1]!, m[2]!);
  }

  // C: dict string pairs — store value under dict key name AND under variable value
  DICT_PAIR_RE.lastIndex = 0;
  while ((m = DICT_PAIR_RE.exec(src)) !== null) {
    const key = m[1]!;
    const val = m[2]!;
    // store: map["queue"] = "intake_queue"  (lookup by dict-key)
    if (!map.has(key)) map.set(key, val);
    // store: map["intake_queue"] = "intake_queue"  (passthrough — value is itself)
    if (!map.has(val)) map.set(val, val);
  }

  // D: resolve settings.X references using envConfig
  const envByKey = new Map(envConfig.map((e) => [e.key.toLowerCase(), e.value]));
  SETTINGS_REF_RE.lastIndex = 0;
  while ((m = SETTINGS_REF_RE.exec(src)) !== null) {
    const attr = m[1]!;
    const envVal = envByKey.get(attr.toLowerCase());
    if (envVal && !map.has(`settings.${attr}`)) {
      map.set(`settings.${attr}`, envVal);
    }
  }

  return map;
}

/**
 * Resolve a token that appears as an argument in a function call.
 *
 * Examples:
 *   "intake_queue"          → "intake_queue"   (string literal)
 *   queue_name              → map.get("queue_name") ?? undefined
 *   settings.backend_url    → map.get("settings.backend_url") ?? undefined
 *   f"{settings.redis_url}" → map.get("settings.redis_url") ?? undefined  (f-string single var)
 */
export function resolveToken(token: string, map: VariableMap): string | undefined {
  const t = token.trim();

  // Already a string literal
  if (/^["'](.+)["']$/.test(t)) {
    return t.slice(1, -1);
  }

  // f-string with a single interpolation: f"{settings.backend_url}/api/path"
  const fMatch = t.match(/^f["']\{([^}]+)\}([^"']*)["']$/);
  if (fMatch) {
    const inner = fMatch[1]!.trim();
    const suffix = fMatch[2] ?? '';
    const base = map.get(inner);
    if (base) return base + suffix;
    return undefined;
  }

  // settings.X or config.X
  if (/^(?:settings|config)\./.test(t)) {
    return map.get(t);
  }

  // Plain variable or CONSTANT
  return map.get(t);
}
