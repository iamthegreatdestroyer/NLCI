/**
 * @nlci/cli - Serve Command
 *
 * Starts a local API server for NLCI queries.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs/promises';
import http from 'http';

import { NLCIEngine } from '@nlci/core';

import { loadConfig } from '../config.js';

interface ServeOptions {
  index?: string;
  port?: string;
  host?: string;
}

export const serveCommand = new Command('serve')
  .description('Start a local API server for code similarity queries')
  .option('-x, --index <path>', 'Path to index file', '.nlci-index')
  .option('-p, --port <port>', 'Port to listen on', '3000')
  .option('-h, --host <host>', 'Host to bind to', 'localhost')
  .action(async (options: ServeOptions) => {
    const spinner = ora('Starting server...').start();

    try {
      // Load index
      const indexPath = path.resolve(options.index ?? '.nlci-index');
      
      try {
        await fs.access(indexPath);
      } catch {
        throw new Error(
          `Index not found at ${indexPath}. Run 'nlci scan' first.`,
        );
      }

      spinner.text = 'Loading index...';
      const config = await loadConfig(process.cwd());
      const engine = new NLCIEngine(config);
      await engine.load(indexPath);

      const stats = engine.getStats();
      spinner.info(
        `Loaded index with ${stats.totalBlockCount} blocks`,
      );

      // Create server
      const port = parseInt(options.port ?? '3000', 10);
      const host = options.host ?? 'localhost';

      const server = http.createServer(async (req, res) => {
        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        try {
          if (req.method === 'GET' && req.url === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok' }));
            return;
          }

          if (req.method === 'GET' && req.url === '/stats') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(engine.getStats()));
            return;
          }

          if (req.method === 'POST' && req.url === '/query') {
            const body = await readBody(req);
            const { code, file, threshold, maxResults } = JSON.parse(body);

            if (!code) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Missing code field' }));
              return;
            }

            const results = await engine.findSimilar(code, file ?? 'query', {
              threshold: threshold ?? 0.85,
              maxResults: maxResults ?? 10,
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ results }));
            return;
          }

          if (req.method === 'POST' && req.url === '/clones') {
            const summary = engine.generateSummary();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(summary));
            return;
          }

          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not found' }));
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: message }));
        }
      });

      server.listen(port, host, () => {
        spinner.succeed(chalk.green(`Server running at http://${host}:${port}`));

        console.log('\n' + chalk.bold('Endpoints:'));
        console.log(`  GET  /health      - Health check`);
        console.log(`  GET  /stats       - Index statistics`);
        console.log(`  POST /query       - Query for similar code`);
        console.log(`  POST /clones      - Get all detected clones`);

        console.log('\n' + chalk.bold('Example query:'));
        console.log(
          chalk.dim(
            `  curl -X POST http://${host}:${port}/query \\
    -H "Content-Type: application/json" \\
    -d '{"code": "function hello() { return \\"world\\"; }"}'`,
          ),
        );

        console.log('\n' + chalk.dim('Press Ctrl+C to stop the server'));
      });

      // Handle shutdown
      process.on('SIGINT', () => {
        console.log('\n' + chalk.yellow('Shutting down...'));
        server.close(() => {
          console.log(chalk.green('Server stopped.'));
          process.exit(0);
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      spinner.fail(chalk.red(`Server failed to start: ${message}`));
      process.exit(1);
    }
  });

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}
