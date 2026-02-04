/**
 * @nlci/cli - Stats Command
 *
 * Displays index statistics.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs/promises';
import { table } from 'table';

import { NLCIEngine } from '@nlci/core';
import { formatBytes } from '@nlci/shared';

import { loadConfig } from '../config.js';

interface StatsOptions {
  index?: string;
  json?: boolean;
}

export const statsCommand = new Command('stats')
  .description('Display index statistics')
  .option('-x, --index <path>', 'Path to index file', '.nlci-index')
  .option('--json', 'Output as JSON')
  .action(async (options: StatsOptions) => {
    const spinner = ora('Loading index...').start();

    try {
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

      const stats = engine.getStats();

      // Get file size
      const fileStat = await fs.stat(indexPath);
      const fileSize = fileStat.size;

      spinner.succeed('Index loaded');

      if (options.json) {
        console.log(
          JSON.stringify(
            {
              ...stats,
              indexSize: fileSize,
            },
            null,
            2
          )
        );
        return;
      }

      console.log('\n' + chalk.bold('NLCI Index Statistics'));
      console.log(chalk.dim('═'.repeat(50)));

      const data = [
        ['Metric', 'Value'],
        ['Total blocks', String(stats.totalBlocks)],
        ['Unique blocks', String(stats.totalBlocks)],
        ['Hash tables', String(stats.numTables)],
        ['Bits per hash', String(stats.numBits)],
        ['Embedding dimension', String(stats.dimension)],
        ['Index size', formatBytes(fileSize)],
        ['Avg blocks/bucket', stats.avgBucketSize?.toFixed(2) ?? 'N/A'],
        ['Load factor', String(stats.loadFactor?.toFixed(2) ?? 'N/A')],
      ];

      console.log(table(data));

      // LSH configuration
      console.log(chalk.bold('\nLSH Configuration:'));
      console.log(`  Tables (L):     ${stats.numTables}`);
      console.log(`  Bits (K):       ${stats.numBits}`);
      console.log(`  Dimension:      ${stats.dimension}`);
      console.log(
        `  Hash space:     2^${stats.numBits} = ${Math.pow(2, stats.numBits)} buckets per table`
      );

      // Performance estimates
      console.log(chalk.bold('\nPerformance Estimates:'));
      console.log(`  Query time:     O(1) - constant time`);
      console.log(
        `  Collision prob: ~${((1 / Math.pow(2, stats.numBits)) * 100).toFixed(4)}% per table`
      );
      console.log(`  Expected candidates: ~${stats.numTables} per query`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      spinner.fail(chalk.red(`Failed to load stats: ${message}`));
      process.exit(1);
    }
  });
