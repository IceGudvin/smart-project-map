import { Project, SyntaxKind, Node } from 'ts-morph';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { glob } from 'glob';
import type {
  RawParserOutput,
  RawRoute,
  RawHttpCall,
  RawSchema,
  EnvEntry,
} from '@smart-map/shared';

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;

// ─── Routes ──────────────────────────────────────────────────────────────────

function extractRoutes(project: Project): RawRoute[] {
  const routes: RawRoute[] = [];

  for (const file of project.getSourceFiles()) {
    try {
      file.forEachDescendant((node) => {
        // Express/Fastify: app.get('/path', handler)
        if (Node.isCallExpression(node)) {
          const expr = node.getExpression();
          if (Node.isPropertyAccessExpression(expr)) {
            const method = expr.getName().toLowerCase();
            if ((HTTP_METHODS as readonly string[]).includes(method)) {
              const args = node.getArguments();
              const firstArg = args[0];
              const handlerArg = args[1];
              if (firstArg && Node.isStringLiteral(firstArg)) {
                routes.push({
                  method: method.toUpperCase() as RawRoute['method'],
                  path: firstArg.getLiteralValue(),
                  handler: handlerArg?.getText() ?? 'anonymous',
                  file: file.getFilePath(),
                  line: node.getStartLineNumber(),
                });
              }
            }
          }
        }

        // NestJS: @Get('/path'), @Post('/path')
        if (Node.isDecorator(node)) {
          const callExpr = node.getCallExpression();
          if (!callExpr) return;
          const name = callExpr.getExpression().getText();
          if ((HTTP_METHODS as readonly string[]).includes(name.toLowerCase())) {
            const args = callExpr.getArguments();
            const firstArg = args[0];
            const path = firstArg && Node.isStringLiteral(firstArg)
              ? firstArg.getLiteralValue()
              : '/';
            const parent = node.getParent();
            const handler = Node.isMethodDeclaration(parent)
              ? parent.getName()
              : 'unknown';
            routes.push({
              method: name.toUpperCase() as RawRoute['method'],
              path,
              handler,
              file: file.getFilePath(),
              line: node.getStartLineNumber(),
            });
          }
        }
      });
    } catch (err) {
      console.warn(`[layer-1-parser/ts] extractRoutes failed for ${file.getFilePath()}:`, err);
    }
  }

  return routes;
}

// ─── HTTP Calls ───────────────────────────────────────────────────────────────

function extractHttpCalls(project: Project): RawHttpCall[] {
  const calls: RawHttpCall[] = [];

  for (const file of project.getSourceFiles()) {
    try {
      file.forEachDescendant((node) => {
        if (!Node.isCallExpression(node)) return;
        const expr = node.getExpression();
        const text = expr.getText();

        // fetch('url') or fetch(url, { method: 'POST' })
        if (text === 'fetch') {
          const args = node.getArguments();
          const urlArg = args[0];
          const url = urlArg && Node.isStringLiteral(urlArg)
            ? urlArg.getLiteralValue()
            : urlArg?.getText() ?? 'unknown';

          let method: RawHttpCall['method'] = 'GET';
          const optionsArg = args[1];
          if (optionsArg && Node.isObjectLiteralExpression(optionsArg)) {
            const methodProp = optionsArg.getProperty('method');
            if (methodProp && Node.isPropertyAssignment(methodProp)) {
              const init = methodProp.getInitializer();
              if (init && Node.isStringLiteral(init)) {
                method = init.getLiteralValue().toUpperCase() as RawHttpCall['method'];
              }
            }
          }

          calls.push({ url, method, file: file.getFilePath(), line: node.getStartLineNumber() });
        }

        // axios.get/post/...
        if (Node.isPropertyAccessExpression(expr)) {
          const obj = expr.getExpression().getText();
          const methodName = expr.getName().toUpperCase();
          if (
            obj === 'axios' &&
            (HTTP_METHODS as readonly string[]).includes(methodName.toLowerCase())
          ) {
            const urlArg = node.getArguments()[0];
            const url = urlArg && Node.isStringLiteral(urlArg)
              ? urlArg.getLiteralValue()
              : urlArg?.getText() ?? 'unknown';
            calls.push({
              url,
              method: methodName as RawHttpCall['method'],
              file: file.getFilePath(),
              line: node.getStartLineNumber(),
            });
          }
        }

        // got.get/post/...
        if (Node.isPropertyAccessExpression(expr)) {
          const obj = expr.getExpression().getText();
          const methodName = expr.getName().toUpperCase();
          if (
            obj === 'got' &&
            (HTTP_METHODS as readonly string[]).includes(methodName.toLowerCase())
          ) {
            const urlArg = node.getArguments()[0];
            const url = urlArg && Node.isStringLiteral(urlArg)
              ? urlArg.getLiteralValue()
              : urlArg?.getText() ?? 'unknown';
            calls.push({
              url,
              method: methodName as RawHttpCall['method'],
              file: file.getFilePath(),
              line: node.getStartLineNumber(),
            });
          }
        }
      });
    } catch (err) {
      console.warn(`[layer-1-parser/ts] extractHttpCalls failed for ${file.getFilePath()}:`, err);
    }
  }

  return calls;
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

function extractSchemas(project: Project): RawSchema[] {
  const schemas: RawSchema[] = [];

  for (const file of project.getSourceFiles()) {
    try {
      for (const iface of file.getInterfaces()) {
        const fields: RawSchema['fields'] = [];
        for (const prop of iface.getProperties()) {
          fields.push({
            name: prop.getName(),
            type: prop.getType().getText(prop),
            required: !prop.hasQuestionToken(),
          });
        }
        schemas.push({
          name: iface.getName(),
          fields,
          file: file.getFilePath(),
          line: iface.getStartLineNumber(),
        });
      }

      for (const typeAlias of file.getTypeAliases()) {
        const typeNode = typeAlias.getTypeNode();
        if (!typeNode || typeNode.getKind() !== SyntaxKind.TypeLiteral) continue;
        const fields: RawSchema['fields'] = [];
        const typeLiteral = typeNode.asKindOrThrow(SyntaxKind.TypeLiteral);
        for (const prop of typeLiteral.getProperties()) {
          if (Node.isPropertySignature(prop)) {
            fields.push({
              name: prop.getName(),
              type: prop.getType().getText(prop),
              required: !prop.hasQuestionToken(),
            });
          }
        }
        if (fields.length > 0) {
          schemas.push({
            name: typeAlias.getName(),
            fields,
            file: file.getFilePath(),
            line: typeAlias.getStartLineNumber(),
          });
        }
      }
    } catch (err) {
      console.warn(`[layer-1-parser/ts] extractSchemas failed for ${file.getFilePath()}:`, err);
    }
  }

  return schemas;
}

// ─── Env Config ───────────────────────────────────────────────────────────────

function extractEnvConfig(project: Project): EnvEntry[] {
  const entries: EnvEntry[] = [];
  const seen = new Set<string>();

  for (const file of project.getSourceFiles()) {
    try {
      file.forEachDescendant((node) => {
        if (Node.isPropertyAccessExpression(node)) {
          const match = node.getText().match(/^process\.env\.([A-Z0-9_]+)$/);
          if (match?.[1] && !seen.has(match[1])) {
            seen.add(match[1]);
            entries.push({ key: match[1], value: '' });
          }
        }
        if (Node.isElementAccessExpression(node)) {
          const obj = node.getExpression().getText();
          const arg = node.getArgumentExpression();
          if (obj === 'process.env' && arg && Node.isStringLiteral(arg)) {
            const key = arg.getLiteralValue();
            if (!seen.has(key)) {
              seen.add(key);
              entries.push({ key, value: '' });
            }
          }
        }
      });
    } catch (err) {
      console.warn(`[layer-1-parser/ts] extractEnvConfig failed for ${file.getFilePath()}:`, err);
    }
  }

  return entries;
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export async function parseTypeScriptProject(
  rootDir: string,
): Promise<RawParserOutput[]> {
  const tsconfigPath = join(rootDir, 'tsconfig.json');
  const hasTsConfig = existsSync(tsconfigPath);

  const project = new Project(
    hasTsConfig
      ? { tsConfigFilePath: tsconfigPath, skipFileDependencyResolution: true }
      : { compilerOptions: { allowJs: true } },
  );

  if (!hasTsConfig) {
    const files = await glob('**/*.{ts,tsx}', {
      cwd: rootDir,
      ignore: ['node_modules/**', 'dist/**', '**/*.d.ts'],
      absolute: true,
    });
    project.addSourceFilesAtPaths(files);
  }

  return [{
    servicePath: rootDir,
    language: 'typescript',
    framework: detectTsFramework(project),
    routes: extractRoutes(project),
    httpCalls: extractHttpCalls(project),
    redisCalls: [],   // TypeScript Redis extractor — not yet implemented
    schemas: extractSchemas(project),
    envConfig: extractEnvConfig(project),
    parsedAt: Date.now(),
  }];
}

function detectTsFramework(project: Project): RawParserOutput['framework'] {
  for (const file of project.getSourceFiles()) {
    const text = file.getFullText();
    if (text.includes('@nestjs/')) return 'nestjs';
    if (text.includes('fastify')) return 'fastify';
    if (text.includes('express')) return 'express';
    if (text.includes('next')) return 'nextjs';
  }
  return 'unknown';
}
