import { Project, SyntaxKind, Node } from 'ts-morph';
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

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;

function extractRoutes(project: Project): RawRoute[] {
  const routes: RawRoute[] = [];

  for (const file of project.getSourceFiles()) {
    file.forEachDescendant((node) => {
      // Express/Fastify: app.get('/path', ...) or router.post('/path', ...)
      if (Node.isCallExpression(node)) {
        const expr = node.getExpression();
        if (Node.isPropertyAccessExpression(expr)) {
          const method = expr.getName().toLowerCase();
          if ((HTTP_METHODS as readonly string[]).includes(method)) {
            const args = node.getArguments();
            const firstArg = args[0];
            if (firstArg && Node.isStringLiteral(firstArg)) {
              routes.push({
                method: method.toUpperCase() as RawRoute['method'],
                path: firstArg.getLiteralValue(),
                file: file.getFilePath(),
                line: node.getStartLineNumber(),
              });
            }
          }
        }

        // NestJS: @Get('/path'), @Post('/path'), etc.
        if (Node.isDecorator(node.getParent() as Node)) {
          // decorators are handled below
        }
      }

      // NestJS decorators on methods
      if (Node.isDecorator(node)) {
        const callExpr = node.getCallExpression();
        if (!callExpr) return;
        const name = callExpr.getExpression().getText();
        const upperName = name.toUpperCase();
        if ((HTTP_METHODS as readonly string[]).includes(name.toLowerCase())) {
          const args = callExpr.getArguments();
          const firstArg = args[0];
          const path = firstArg && Node.isStringLiteral(firstArg)
            ? firstArg.getLiteralValue()
            : '/';
          routes.push({
            method: upperName as RawRoute['method'],
            path,
            file: file.getFilePath(),
            line: node.getStartLineNumber(),
          });
        }
      }
    });
  }

  return routes;
}

// ─── HTTP Calls ───────────────────────────────────────────────────────────────

function extractHttpCalls(project: Project): RawHttpCall[] {
  const calls: RawHttpCall[] = [];

  for (const file of project.getSourceFiles()) {
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

        let method = 'GET';
        const optionsArg = args[1];
        if (optionsArg && Node.isObjectLiteralExpression(optionsArg)) {
          const methodProp = optionsArg.getProperty('method');
          if (methodProp && Node.isPropertyAssignment(methodProp)) {
            const init = methodProp.getInitializer();
            if (init && Node.isStringLiteral(init)) {
              method = init.getLiteralValue().toUpperCase();
            }
          }
        }

        calls.push({
          url,
          method: method as RawHttpCall['method'],
          file: file.getFilePath(),
          line: node.getStartLineNumber(),
        });
      }

      // axios.get/post/put/delete('url')
      if (Node.isPropertyAccessExpression(expr)) {
        const obj = expr.getExpression().getText();
        const method = expr.getName().toUpperCase();
        if (
          obj === 'axios' &&
          (HTTP_METHODS as readonly string[]).includes(method.toLowerCase())
        ) {
          const urlArg = node.getArguments()[0];
          const url = urlArg && Node.isStringLiteral(urlArg)
            ? urlArg.getLiteralValue()
            : urlArg?.getText() ?? 'unknown';
          calls.push({
            url,
            method: method as RawHttpCall['method'],
            file: file.getFilePath(),
            line: node.getStartLineNumber(),
          });
        }
      }
    });
  }

  return calls;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

function extractSchemas(project: Project): RawSchema[] {
  const schemas: RawSchema[] = [];

  for (const file of project.getSourceFiles()) {
    // TypeScript interfaces
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

    // TypeScript type aliases (object types)
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
  }

  return schemas;
}

// ─── Env Config ───────────────────────────────────────────────────────────────

function extractEnvConfig(project: Project): EnvEntry[] {
  const entries: EnvEntry[] = [];
  const seen = new Set<string>();

  for (const file of project.getSourceFiles()) {
    file.forEachDescendant((node) => {
      // process.env.KEY or process.env['KEY']
      if (Node.isPropertyAccessExpression(node)) {
        const text = node.getText();
        const match = text.match(/^process\.env\.([A-Z0-9_]+)$/);
        if (match && match[1] && !seen.has(match[1])) {
          seen.add(match[1]);
          entries.push({
            key: match[1],
            file: file.getFilePath(),
            line: node.getStartLineNumber(),
          });
        }
      }

      if (Node.isElementAccessExpression(node)) {
        const obj = node.getExpression().getText();
        const arg = node.getArgumentExpression();
        if (
          obj === 'process.env' &&
          arg &&
          Node.isStringLiteral(arg)
        ) {
          const key = arg.getLiteralValue();
          if (!seen.has(key)) {
            seen.add(key);
            entries.push({
              key,
              file: file.getFilePath(),
              line: node.getStartLineNumber(),
            });
          }
        }
      }
    });
  }

  return entries;
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export async function parseTypeScriptProject(
  rootDir: string,
): Promise<RawParserOutput[]> {
  const tsconfigPath = join(rootDir, 'tsconfig.json');

  const project = new Project({
    tsConfigFilePath: existsSync(tsconfigPath) ? tsconfigPath : undefined,
    addFilesFromTsConfig: existsSync(tsconfigPath),
    skipFileDependencyResolution: true,
  });

  if (!existsSync(tsconfigPath)) {
    const files = await glob('**/*.{ts,tsx}', {
      cwd: rootDir,
      ignore: ['node_modules/**', 'dist/**', '**/*.d.ts'],
      absolute: true,
    });
    project.addSourceFilesAtPaths(files);
  }

  const serviceName = basename(rootDir);

  const output: RawParserOutput = {
    serviceName,
    language: 'typescript',
    framework: detectTsFramework(project),
    routes: extractRoutes(project),
    httpCalls: extractHttpCalls(project),
    schemas: extractSchemas(project),
    envConfig: extractEnvConfig(project),
  };

  return [output];
}

function detectTsFramework(
  project: Project,
): RawParserOutput['framework'] {
  for (const file of project.getSourceFiles()) {
    const text = file.getFullText();
    if (text.includes('@nestjs/')) return 'nestjs';
    if (text.includes('fastify')) return 'fastify';
    if (text.includes('express')) return 'express';
    if (text.includes('next')) return 'nextjs';
  }
  return 'unknown';
}

function existsSync(path: string): boolean {
  try {
    import('node:fs').then(({ existsSync: es }) => es(path));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { existsSync: es } = require('node:fs');
    return es(path) as boolean;
  } catch {
    return false;
  }
}
