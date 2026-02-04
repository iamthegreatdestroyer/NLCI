/**
 * @nlci/cli - Configuration Loader
 *
 * Uses cosmiconfig to load NLCI configuration from various file formats.
 */

import type { NLCIConfig } from '@nlci/core';
import { cosmiconfig } from 'cosmiconfig';
import path from 'path';

const explorer = cosmiconfig('nlci', {
  searchPlaces: [
    'package.json',
    'nlci.config.json',
    'nlci.config.js',
    'nlci.config.cjs',
    'nlci.config.mjs',
    'nlci.config.ts',
    '.nlcirc',
    '.nlcirc.json',
    '.nlcirc.js',
    '.nlcirc.cjs',
  ],
});

/**
 * Default configuration values
 */
const defaultConfig: Partial<NLCIConfig> = {
  lsh: {
    numTables: 20,
    numBits: 12,
    dimension: 384,
    multiProbe: {
      enabled: true,
      numProbes: 3,
    },
  },
  embedding: {
    modelType: 'onnx',
    modelPath: './models/code-embedder-small/model.onnx',
    dimension: 384,
    maxSequenceLength: 512,
    batchSize: 32,
    useGPU: true,
    normalize: true,
  },
  parser: {
    languages: [],
    minBlockSize: 10,
    maxBlockSize: 10000,
    extractFunctions: true,
    extractClasses: true,
    extractBlocks: false,
    includePatterns: [
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

/**
 * Load NLCI configuration from the filesystem.
 *
 * @param searchFrom - Directory to start searching from
 * @param configPath - Optional explicit config file path
 * @returns Merged configuration
 */
export async function loadConfig(
  searchFrom: string,
  configPath?: string
): Promise<Partial<NLCIConfig>> {
  let result;

  if (configPath) {
    result = await explorer.load(path.resolve(configPath));
  } else {
    result = await explorer.search(searchFrom);
  }

  if (!result || result.isEmpty) {
    return defaultConfig;
  }

  return mergeConfig(defaultConfig, result.config as Partial<NLCIConfig>);
}

/**
 * Deep merge configuration objects
 */
function mergeConfig(
  defaults: Partial<NLCIConfig>,
  overrides: Partial<NLCIConfig>
): Partial<NLCIConfig> {
  const result: Partial<NLCIConfig> = { ...defaults };

  if (overrides.lsh) {
    result.lsh = { ...defaults.lsh, ...overrides.lsh };
  }

  if (overrides.embedding) {
    result.embedding = { ...defaults.embedding, ...overrides.embedding };
  }

  if (overrides.parser) {
    result.parser = { ...defaults.parser, ...overrides.parser };
  }

  return result;
}

/**
 * Get the default configuration
 */
export function getDefaultConfig(): Partial<NLCIConfig> {
  return { ...defaultConfig };
}
