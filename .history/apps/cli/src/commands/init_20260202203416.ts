/**
 * @nlci/cli - Init Command
 *
 * Initializes NLCI configuration in a project.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs/promises';

interface InitOptions {
  force?: boolean;
  typescript?: boolean;
  json?: boolean;
}

const CONFIG_TEMPLATE_TS = `/**
 * NLCI Configuration
 * @type {import('@nlci/core').NLCIConfig}
 */
export default {
  // LSH parameters for similarity detection
  lsh: {
    numTables: 20,      // Number of hash tables (L)
    numBits: 12,        // Bits per hash (K)
    dimension: 384,     // Embedding dimension
  },

  // Embedding model configuration
  embedding: {
    model: 'sentence-transformers/all-MiniLM-L6-v2',
    batchSize: 32,
    maxLength: 512,
  },

  // Parser configuration
  parser: {
    minBlockSize: 10,   // Minimum tokens per block
    maxBlockSize: 10000, // Maximum tokens per block
    includePatterns: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx',
      '**/*.py',
      '**/*.java',
      '**/*.go',
      '**/*.rs',
    ],
    excludePatterns: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**',
      '**/vendor/**',
      '**/__pycache__/**',
      '**/*.min.js',
      '**/*.min.css',
    ],
  },
};
`;

const CONFIG_TEMPLATE_JSON = `{
  "lsh": {
    "numTables": 20,
    "numBits": 12,
    "dimension": 384
  },
  "embedding": {
    "model": "sentence-transformers/all-MiniLM-L6-v2",
    "batchSize": 32,
    "maxLength": 512
  },
  "parser": {
    "minBlockSize": 10,
    "maxBlockSize": 10000,
    "includePatterns": [
      "**/*.ts",
      "**/*.tsx",
      "**/*.js",
      "**/*.jsx",
      "**/*.py",
      "**/*.java",
      "**/*.go",
      "**/*.rs"
    ],
    "excludePatterns": [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.git/**",
      "**/vendor/**",
      "**/__pycache__/**",
      "**/*.min.js",
      "**/*.min.css"
    ]
  }
}
`;

const GITIGNORE_ADDITIONS = `
# NLCI
.nlci-index
.nlci-meta.json
`;

export const initCommand = new Command('init')
  .description('Initialize NLCI configuration in the current directory')
  .option('-f, --force', 'Overwrite existing configuration')
  .option('--typescript', 'Use TypeScript configuration file')
  .option('--json', 'Use JSON configuration file')
  .action(async (options: InitOptions) => {
    const spinner = ora('Initializing NLCI...').start();

    try {
      const cwd = process.cwd();

      // Determine config file type
      let configFileName: string;
      let configContent: string;

      if (options.json) {
        configFileName = 'nlci.config.json';
        configContent = CONFIG_TEMPLATE_JSON;
      } else if (options.typescript) {
        configFileName = 'nlci.config.ts';
        configContent = CONFIG_TEMPLATE_TS;
      } else {
        // Default to .js for maximum compatibility
        configFileName = 'nlci.config.js';
        configContent = CONFIG_TEMPLATE_TS.replace('export default', 'module.exports =');
      }

      const configPath = path.join(cwd, configFileName);

      // Check if config already exists
      if (!options.force) {
        try {
          await fs.access(configPath);
          spinner.fail(
            `Configuration file already exists: ${configFileName}. Use --force to overwrite.`
          );
          return;
        } catch {
          // File doesn't exist, continue
        }
      }

      // Write config file
      spinner.text = `Creating ${configFileName}...`;
      await fs.writeFile(configPath, configContent, 'utf-8');

      // Update .gitignore
      spinner.text = 'Updating .gitignore...';
      const gitignorePath = path.join(cwd, '.gitignore');
      try {
        const existingGitignore = await fs.readFile(gitignorePath, 'utf-8');
        if (!existingGitignore.includes('.nlci-index')) {
          await fs.appendFile(gitignorePath, GITIGNORE_ADDITIONS, 'utf-8');
        }
      } catch {
        // .gitignore doesn't exist, create it
        await fs.writeFile(gitignorePath, GITIGNORE_ADDITIONS.trim(), 'utf-8');
      }

      spinner.succeed(chalk.green('NLCI initialized successfully!'));

      console.log('\n' + chalk.bold('Created files:'));
      console.log(`  ${chalk.cyan(configFileName)}`);

      console.log('\n' + chalk.bold('Next steps:'));
      console.log(`  1. Review and customize ${chalk.cyan(configFileName)}`);
      console.log(`  2. Run ${chalk.cyan('nlci scan')} to build the index`);
      console.log(`  3. Run ${chalk.cyan('nlci query --file <path>')} to find similar code`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      spinner.fail(chalk.red(`Initialization failed: ${message}`));
      process.exit(1);
    }
  });
