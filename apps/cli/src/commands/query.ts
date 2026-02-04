/**
 * @nlci/cli - Query Command
 *
 * Queries the LSH index for similar code blocks.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs/promises';
import { table } from 'table';

import { NLCIEngine } from '@nlci/core';
import type { CloneResult } from '@nlci/core';
import { formatDuration } from '@nlci/shared';

import { loadConfig } from '../config.js';

interface QueryOptions {
  index?: string;
  file?: string;
  code?: string;
  threshold?: string;
  limit?: string;
  type?: string;
  format?: 'table' | 'json' | 'compact';
  verbose?: boolean;
}

export const queryCommand = new Command('query')
  .description('Query for similar code blocks')
  .option('-x, --index <path>', 'Path to index file', '.nlci-index')
  .option('-f, --file <path>', 'Query using code from a file')
  .option('-c, --code <code>', 'Query using inline code snippet')
  .option('-t, --threshold <value>', 'Minimum similarity threshold (0-1)', '0.85')
  .option('-n, --limit <n>', 'Maximum number of results', '10')
  .option('--type <type>', 'Filter by clone type (1, 2, 3, 4)')
  .option('--format <format>', 'Output format (table, json, compact)', 'table')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (options: QueryOptions) => {
    const spinner = ora('Loading index...').start();

    try {
      // Validate input
      if (!options.file && !options.code) {
        throw new Error('Either --file or --code must be provided');
      }

      // Get query code
      let queryCode: string;
      if (options.file) {
        const filePath = path.resolve(options.file);
        queryCode = await fs.readFile(filePath, 'utf-8');
      } else {
        queryCode = options.code!;
      }

      // Load index
      const indexPath = path.resolve(options.index ?? '.nlci-index');

      try {
        await fs.access(indexPath);
      } catch {
        throw new Error(`Index not found at ${indexPath}. Run 'nlci scan' first.`);
      }

      const config = await loadConfig(process.cwd());
      const engine = new NLCIEngine(config);
      await engine.load();

      spinner.text = 'Querying...';
      const startTime = performance.now();

      // Execute query
      const threshold = parseFloat(options.threshold ?? '0.85');
      const limit = parseInt(options.limit ?? '10', 10);

      const result = await engine.query(queryCode, {
        minSimilarity: threshold,
        maxResults: limit,
      });

      const duration = performance.now() - startTime;

      // Filter by clone type if specified
      let filteredClones = [...result.clones];
      if (options.type) {
        const cloneType = `type-${options.type}` as CloneResult['cloneType'];
        filteredClones = filteredClones.filter((r) => r.cloneType === cloneType);
      }

      spinner.succeed(
        `Found ${filteredClones.length} similar code blocks in ${formatDuration(duration)}`
      );

      // Display results
      if (filteredClones.length === 0) {
        console.log(chalk.yellow('\nNo similar code blocks found.'));
        return;
      }

      if (options.format === 'json') {
        console.log(JSON.stringify(filteredClones, null, 2));
      } else if (options.format === 'compact') {
        displayCompact(filteredClones);
      } else {
        displayTable(filteredClones, options.verbose ?? false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      spinner.fail(chalk.red(`Query failed: ${message}`));
      process.exit(1);
    }
  });

function displayTable(results: CloneResult[], verbose: boolean): void {
  const headers = ['#', 'Type', 'Similarity', 'File', 'Lines'];
  const rows = results.map((result, index) => [
    String(index + 1),
    formatCloneType(result.cloneType),
    formatSimilarity(result.similarity),
    truncatePath(result.target.filePath ?? 'unknown', 40),
    `${result.target.startLine}-${result.target.endLine}`,
  ]);

  console.log('\n' + table([headers, ...rows]));

  if (verbose) {
    console.log(chalk.bold('\nDetails:'));
    for (const result of results) {
      console.log(`\n${chalk.cyan(result.target.filePath ?? 'unknown')}:`);
      console.log(`  Lines ${result.target.startLine}-${result.target.endLine}`);
      console.log(`  Similarity: ${formatSimilarity(result.similarity)} (${result.cloneType})`);
    }
  }
}

function displayCompact(results: CloneResult[]): void {
  for (const result of results) {
    const similarity = (result.similarity * 100).toFixed(0);
    const type = result.cloneType.replace('type-', 'T');
    console.log(`${similarity}% ${type} ${result.target.filePath}:${result.target.startLine}`);
  }
}

function formatCloneType(type: string): string {
  const colors: Record<string, (s: string) => string> = {
    'type-1': chalk.red,
    'type-2': chalk.yellow,
    'type-3': chalk.cyan,
    'type-4': chalk.green,
  };
  const colorFn = colors[type] ?? chalk.white;
  return colorFn(type.toUpperCase());
}

function formatSimilarity(value: number): string {
  const percentage = (value * 100).toFixed(1);
  if (value >= 0.95) return chalk.red(`${percentage}%`);
  if (value >= 0.85) return chalk.yellow(`${percentage}%`);
  return chalk.green(`${percentage}%`);
}

function truncatePath(filePath: string, maxLength: number): string {
  if (filePath.length <= maxLength) return filePath;
  const parts = filePath.split(/[/\\]/);
  let result = parts[parts.length - 1];
  for (let i = parts.length - 2; i >= 0 && result.length < maxLength - 3; i--) {
    result = parts[i] + '/' + result;
  }
  return '...' + result.slice(-(maxLength - 3));
}
