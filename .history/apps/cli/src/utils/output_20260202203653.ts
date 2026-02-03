/**
 * @nlci/cli - Output Utilities
 *
 * Formatted output helpers for CLI.
 */

import chalk from 'chalk';

/**
 * Print a success message.
 */
export function success(message: string): void {
  console.log(chalk.green('✓'), message);
}

/**
 * Print an info message.
 */
export function info(message: string): void {
  console.log(chalk.blue('ℹ'), message);
}

/**
 * Print a warning message.
 */
export function warn(message: string): void {
  console.log(chalk.yellow('⚠'), message);
}

/**
 * Print an error message.
 */
export function error(message: string): void {
  console.log(chalk.red('✖'), message);
}

/**
 * Print a debug message (only if DEBUG is set).
 */
export function debug(message: string): void {
  if (process.env.DEBUG) {
    console.log(chalk.dim('[DEBUG]'), message);
  }
}

/**
 * Print a horizontal rule.
 */
export function hr(char = '─', length = 50): void {
  console.log(chalk.dim(char.repeat(length)));
}

/**
 * Print a heading.
 */
export function heading(text: string): void {
  console.log();
  console.log(chalk.bold(text));
  hr();
}

/**
 * Print a key-value pair.
 */
export function kv(key: string, value: string | number, indent = 2): void {
  const padding = ' '.repeat(indent);
  console.log(`${padding}${chalk.dim(key + ':')} ${value}`);
}

/**
 * Print a list of items.
 */
export function list(items: string[], bullet = '•', indent = 2): void {
  const padding = ' '.repeat(indent);
  for (const item of items) {
    console.log(`${padding}${chalk.dim(bullet)} ${item}`);
  }
}

/**
 * Print JSON with syntax highlighting.
 */
export function json(data: unknown): void {
  const str = JSON.stringify(data, null, 2);
  const highlighted = str
    .replace(/"([^"]+)":/g, chalk.cyan('"$1":'))
    .replace(/: "([^"]+)"/g, ': ' + chalk.green('"$1"'))
    .replace(/: (\d+)/g, ': ' + chalk.yellow('$1'))
    .replace(/: (true|false)/g, ': ' + chalk.magenta('$1'))
    .replace(/: null/g, ': ' + chalk.dim('null'));

  console.log(highlighted);
}

/**
 * Create a progress bar string.
 */
export function progressBar(
  current: number,
  total: number,
  width = 30,
): string {
  const percentage = Math.min(1, current / total);
  const filled = Math.round(width * percentage);
  const empty = width - filled;

  const bar = chalk.green('█'.repeat(filled)) + chalk.dim('░'.repeat(empty));
  const percent = (percentage * 100).toFixed(0).padStart(3);

  return `${bar} ${percent}%`;
}

/**
 * Format a table with borders.
 */
export function simpleTable(
  headers: string[],
  rows: string[][],
): string {
  const colWidths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)),
  );

  const separator = chalk.dim(
    '├' + colWidths.map((w) => '─'.repeat(w + 2)).join('┼') + '┤',
  );

  const formatRow = (row: string[]): string => {
    return (
      chalk.dim('│') +
      row
        .map((cell, i) => ` ${cell.padEnd(colWidths[i])} `)
        .join(chalk.dim('│')) +
      chalk.dim('│')
    );
  };

  const headerRow = formatRow(headers.map((h) => chalk.bold(h)));
  const dataRows = rows.map(formatRow);

  const top = chalk.dim(
    '┌' + colWidths.map((w) => '─'.repeat(w + 2)).join('┬') + '┐',
  );
  const bottom = chalk.dim(
    '└' + colWidths.map((w) => '─'.repeat(w + 2)).join('┴') + '┘',
  );

  return [top, headerRow, separator, ...dataRows, bottom].join('\n');
}
