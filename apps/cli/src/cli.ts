/**
 * @nlci/cli - Main CLI Entry Point
 *
 * Command-line interface for NLCI - Neural-LSH Code Intelligence.
 */

import chalk from 'chalk';
import { Command } from 'commander';

import { initCommand } from './commands/init.js';
import { queryCommand } from './commands/query.js';
import { reportCommand } from './commands/report.js';
import { scanCommand } from './commands/scan.js';
import { serveCommand } from './commands/serve.js';
import { statsCommand } from './commands/stats.js';
import { version } from './version.js';

const program = new Command();

program
  .name('nlci')
  .description(
    chalk.cyan(`
╔═══════════════════════════════════════════════════════════╗
║       NLCI - Neural-LSH Code Intelligence                ║
║       Sub-linear Code Similarity Detection               ║
╚═══════════════════════════════════════════════════════════╝

Index your codebase in O(n) time, query for similar code in O(1).
`)
  )
  .version(version, '-v, --version', 'Display version number')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('--debug', 'Enable debug output')
  .option('--no-color', 'Disable colored output');

// Register commands
program.addCommand(scanCommand);
program.addCommand(queryCommand);
program.addCommand(initCommand);
program.addCommand(serveCommand);
program.addCommand(reportCommand);
program.addCommand(statsCommand);

// Error handling
program.exitOverride((err) => {
  if (err.code === 'commander.helpDisplayed' || err.code === 'commander.version') {
    process.exit(0);
  }
  console.error(chalk.red(`Error: ${err.message}`));
  process.exit(1);
});

// Parse arguments
async function main(): Promise<void> {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`Error: ${error.message}`));
      if (process.env.DEBUG || program.opts().debug) {
        console.error(error.stack);
      }
    }
    process.exit(1);
  }
}

void main();
