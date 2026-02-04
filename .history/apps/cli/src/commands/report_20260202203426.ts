/**
 * @nlci/cli - Report Command
 *
 * Generates a code clone report.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs/promises';
import { table } from 'table';

import { NLCIEngine } from '@nlci/core';
import type { ScanSummary } from '@nlci/core';
import { formatDuration } from '@nlci/shared';

import { loadConfig } from '../config.js';

interface ReportOptions {
  index?: string;
  output?: string;
  format?: 'console' | 'json' | 'html' | 'markdown';
  threshold?: string;
}

export const reportCommand = new Command('report')
  .description('Generate a code clone report')
  .option('-x, --index <path>', 'Path to index file', '.nlci-index')
  .option('-o, --output <path>', 'Output file path')
  .option('-f, --format <format>', 'Report format (console, json, html, markdown)', 'console')
  .option('-t, --threshold <value>', 'Minimum similarity threshold', '0.85')
  .action(async (options: ReportOptions) => {
    const spinner = ora('Generating report...').start();

    try {
      // Load index
      const indexPath = path.resolve(options.index ?? '.nlci-index');

      try {
        await fs.access(indexPath);
      } catch {
        throw new Error(`Index not found at ${indexPath}. Run 'nlci scan' first.`);
      }

      spinner.text = 'Loading index...';
      const config = await loadConfig(process.cwd());
      const engine = new NLCIEngine(config);
      await engine.load(indexPath);

      spinner.text = 'Analyzing clones...';
      const startTime = performance.now();
      const summary = engine.generateSummary();
      const duration = performance.now() - startTime;

      spinner.succeed(`Report generated in ${formatDuration(duration)}`);

      // Output report
      const format = options.format ?? 'console';
      let output: string;

      switch (format) {
        case 'json':
          output = formatJson(summary);
          break;
        case 'html':
          output = formatHtml(summary);
          break;
        case 'markdown':
          output = formatMarkdown(summary);
          break;
        default:
          formatConsole(summary);
          return;
      }

      if (options.output) {
        const outputPath = path.resolve(options.output);
        await fs.writeFile(outputPath, output, 'utf-8');
        console.log(chalk.green(`Report saved to: ${outputPath}`));
      } else {
        console.log(output);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      spinner.fail(chalk.red(`Report generation failed: ${message}`));
      process.exit(1);
    }
  });

function formatConsole(summary: ScanSummary): void {
  console.log('\n' + chalk.bold('═══════════════════════════════════════════'));
  console.log(chalk.bold('           NLCI Clone Detection Report        '));
  console.log(chalk.bold('═══════════════════════════════════════════\n'));

  console.log(chalk.bold('Overview:'));
  console.log(`  Total code blocks:  ${summary.totalBlocks}`);
  console.log(`  Clone clusters:     ${summary.cloneClusters}`);
  console.log(`  Clone ratio:        ${(summary.cloneRatio * 100).toFixed(1)}%`);

  console.log('\n' + chalk.bold('Clone Types:'));
  const typeHeaders = ['Type', 'Description', 'Count', 'Percentage'];
  const typeRows = [
    [
      'Type-1',
      'Exact clones',
      String(summary.clonesByType['type-1'] ?? 0),
      `${(((summary.clonesByType['type-1'] ?? 0) / summary.totalBlocks) * 100).toFixed(1)}%`,
    ],
    [
      'Type-2',
      'Parameterized clones',
      String(summary.clonesByType['type-2'] ?? 0),
      `${(((summary.clonesByType['type-2'] ?? 0) / summary.totalBlocks) * 100).toFixed(1)}%`,
    ],
    [
      'Type-3',
      'Near-miss clones',
      String(summary.clonesByType['type-3'] ?? 0),
      `${(((summary.clonesByType['type-3'] ?? 0) / summary.totalBlocks) * 100).toFixed(1)}%`,
    ],
    [
      'Type-4',
      'Semantic clones',
      String(summary.clonesByType['type-4'] ?? 0),
      `${(((summary.clonesByType['type-4'] ?? 0) / summary.totalBlocks) * 100).toFixed(1)}%`,
    ],
  ];
  console.log(table([typeHeaders, ...typeRows]));

  if (summary.hotspots && summary.hotspots.length > 0) {
    console.log(chalk.bold('Hotspots (files with most clones):'));
    const hotspotHeaders = ['File', 'Clone Count'];
    const hotspotRows = summary.hotspots.slice(0, 10).map((h) => [h.file, String(h.count)]);
    console.log(table([hotspotHeaders, ...hotspotRows]));
  }
}

function formatJson(summary: ScanSummary): string {
  return JSON.stringify(summary, null, 2);
}

function formatHtml(summary: ScanSummary): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NLCI Clone Detection Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; border-bottom: 2px solid #007acc; padding-bottom: 10px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
    .card { background: #f5f5f5; padding: 20px; border-radius: 8px; }
    .card h3 { margin: 0 0 10px 0; color: #666; font-size: 14px; }
    .card .value { font-size: 32px; font-weight: bold; color: #333; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #007acc; color: white; }
    tr:hover { background: #f5f5f5; }
  </style>
</head>
<body>
  <h1>NLCI Clone Detection Report</h1>
  
  <div class="summary">
    <div class="card">
      <h3>Total Blocks</h3>
      <div class="value">${summary.totalBlocks}</div>
    </div>
    <div class="card">
      <h3>Clone Clusters</h3>
      <div class="value">${summary.cloneClusters}</div>
    </div>
    <div class="card">
      <h3>Clone Ratio</h3>
      <div class="value">${(summary.cloneRatio * 100).toFixed(1)}%</div>
    </div>
  </div>

  <h2>Clone Types</h2>
  <table>
    <thead>
      <tr><th>Type</th><th>Description</th><th>Count</th></tr>
    </thead>
    <tbody>
      <tr><td>Type-1</td><td>Exact clones</td><td>${summary.clonesByType['type-1'] ?? 0}</td></tr>
      <tr><td>Type-2</td><td>Parameterized clones</td><td>${summary.clonesByType['type-2'] ?? 0}</td></tr>
      <tr><td>Type-3</td><td>Near-miss clones</td><td>${summary.clonesByType['type-3'] ?? 0}</td></tr>
      <tr><td>Type-4</td><td>Semantic clones</td><td>${summary.clonesByType['type-4'] ?? 0}</td></tr>
    </tbody>
  </table>

  <footer>
    <p>Generated by NLCI - Neural-LSH Code Intelligence</p>
  </footer>
</body>
</html>`;
}

function formatMarkdown(summary: ScanSummary): string {
  return `# NLCI Clone Detection Report

## Overview

| Metric | Value |
|--------|-------|
| Total Blocks | ${summary.totalBlocks} |
| Clone Clusters | ${summary.cloneClusters} |
| Clone Ratio | ${(summary.cloneRatio * 100).toFixed(1)}% |

## Clone Types

| Type | Description | Count |
|------|-------------|-------|
| Type-1 | Exact clones | ${summary.clonesByType['type-1'] ?? 0} |
| Type-2 | Parameterized clones | ${summary.clonesByType['type-2'] ?? 0} |
| Type-3 | Near-miss clones | ${summary.clonesByType['type-3'] ?? 0} |
| Type-4 | Semantic clones | ${summary.clonesByType['type-4'] ?? 0} |

---

*Generated by NLCI - Neural-LSH Code Intelligence*
`;
}
