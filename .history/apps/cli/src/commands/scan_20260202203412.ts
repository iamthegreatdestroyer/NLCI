/**
 * @nlci/cli - Scan Command
 *
 * Scans a directory for code blocks and builds the LSH index.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { glob } from 'glob';
import path from 'path';
import fs from 'fs/promises';

import type { NLCIConfig } from '@nlci/core';
import { NLCIEngine } from '@nlci/core';
import { formatBytes, formatDuration } from '@nlci/shared';

import { loadConfig } from '../config.js';
import { resolveGlobs, getRelativePath } from '../utils/paths.js';

interface ScanOptions {
  output?: string;
  config?: string;
  include?: string[];
  exclude?: string[];
  minTokens?: string;
  maxTokens?: string;
  languages?: string[];
  verbose?: boolean;
  force?: boolean;
}

export const scanCommand = new Command('scan')
  .description('Scan a directory and build the code similarity index')
  .argument('[path]', 'Path to scan (defaults to current directory)', '.')
  .option('-o, --output <path>', 'Output path for index file', '.nlci-index')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('-i, --include <patterns...>', 'Glob patterns to include')
  .option('-e, --exclude <patterns...>', 'Glob patterns to exclude')
  .option('--min-tokens <n>', 'Minimum tokens per code block', '10')
  .option('--max-tokens <n>', 'Maximum tokens per code block', '10000')
  .option('-l, --languages <langs...>', 'Languages to include')
  .option('-v, --verbose', 'Show detailed output')
  .option('-f, --force', 'Force rebuild of existing index')
  .action(async (targetPath: string, options: ScanOptions) => {
    const spinner = ora('Initializing...').start();

    try {
      // Resolve target path
      const absolutePath = path.resolve(targetPath);
      
      // Check if path exists
      const stat = await fs.stat(absolutePath);
      if (!stat.isDirectory()) {
        throw new Error(`Not a directory: ${absolutePath}`);
      }

      // Load configuration
      spinner.text = 'Loading configuration...';
      const config = await loadConfig(absolutePath, options.config);

      // Merge CLI options with config
      const mergedConfig = mergeOptions(config, options);

      // Check for existing index
      const indexPath = path.resolve(options.output ?? '.nlci-index');
      if (!options.force) {
        try {
          await fs.access(indexPath);
          spinner.warn(
            'Index already exists. Use --force to rebuild.',
          );
          return;
        } catch {
          // Index doesn't exist, continue
        }
      }

      // Find files to scan
      spinner.text = 'Finding files...';
      const files = await findFiles(absolutePath, mergedConfig);

      if (files.length === 0) {
        spinner.warn('No files found matching the criteria.');
        return;
      }

      spinner.info(`Found ${files.length} files to scan.`);

      // Create engine
      spinner.text = 'Creating NLCI engine...';
      const engine = new NLCIEngine(mergedConfig);

      // Scan files
      const startTime = performance.now();
      let processedFiles = 0;
      let totalBlocks = 0;
      let totalBytes = 0;

      for (const file of files) {
        const relativePath = getRelativePath(absolutePath, file);
        spinner.text = `Scanning: ${relativePath}`;

        try {
          const content = await fs.readFile(file, 'utf-8');
          totalBytes += Buffer.byteLength(content);

          const summary = await engine.indexCode(content, file);
          totalBlocks += summary.totalBlocks;
          processedFiles++;

          if (options.verbose) {
            spinner.info(
              `  ${relativePath}: ${summary.totalBlocks} blocks`,
            );
          }
        } catch (error) {
          if (options.verbose) {
            const message =
              error instanceof Error ? error.message : String(error);
            spinner.warn(`  Skipped ${relativePath}: ${message}`);
          }
        }
      }

      const duration = performance.now() - startTime;

      // Save index
      spinner.text = 'Saving index...';
      await engine.save(indexPath);

      // Get stats
      const stats = engine.getStats();

      spinner.succeed(chalk.green('Scan complete!'));

      // Display summary
      console.log('\n' + chalk.bold('Summary:'));
      console.log(`  Files scanned:  ${processedFiles}`);
      console.log(`  Code blocks:    ${totalBlocks}`);
      console.log(`  Unique hashes:  ${stats.uniqueBlockCount}`);
      console.log(`  Data processed: ${formatBytes(totalBytes)}`);
      console.log(`  Duration:       ${formatDuration(duration)}`);
      console.log(`  Index saved to: ${indexPath}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      spinner.fail(chalk.red(`Scan failed: ${message}`));
      process.exit(1);
    }
  });

function mergeOptions(
  config: Partial<NLCIConfig>,
  options: ScanOptions,
): Partial<NLCIConfig> {
  return {
    ...config,
    parser: {
      ...config.parser,
      minBlockSize: options.minTokens
        ? parseInt(options.minTokens, 10)
        : config.parser?.minBlockSize,
      maxBlockSize: options.maxTokens
        ? parseInt(options.maxTokens, 10)
        : config.parser?.maxBlockSize,
      includePatterns: options.include ?? config.parser?.includePatterns,
      excludePatterns: options.exclude ?? config.parser?.excludePatterns,
    },
  };
}

async function findFiles(
  basePath: string,
  config: Partial<NLCIConfig>,
): Promise<string[]> {
  const include = config.parser?.includePatterns ?? [
    '**/*.ts',
    '**/*.tsx',
    '**/*.js',
    '**/*.jsx',
    '**/*.py',
    '**/*.java',
    '**/*.go',
    '**/*.rs',
    '**/*.c',
    '**/*.cpp',
    '**/*.h',
    '**/*.hpp',
  ];

  const exclude = config.parser?.excludePatterns ?? [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**',
    '**/vendor/**',
    '**/__pycache__/**',
  ];

  const files = await glob(include, {
    cwd: basePath,
    absolute: true,
    ignore: exclude,
    nodir: true,
  });

  return files;
}
