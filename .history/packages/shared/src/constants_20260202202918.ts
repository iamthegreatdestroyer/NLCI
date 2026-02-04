/**
 * @nlci/shared - Constants
 *
 * Shared constants used across NLCI packages.
 */

/**
 * Package information.
 */
export const PACKAGE_NAME = '@nlci/core';
export const PACKAGE_VERSION = '0.1.0';

/**
 * Default file size limits.
 */
export const MAX_FILE_SIZE = 1024 * 1024; // 1MB
export const MIN_BLOCK_SIZE = 10; // tokens
export const MAX_BLOCK_SIZE = 10000; // tokens

/**
 * LSH default parameters.
 */
export const DEFAULT_NUM_TABLES = 20;
export const DEFAULT_NUM_BITS = 12;
export const DEFAULT_DIMENSION = 384;

/**
 * Similarity thresholds for clone types.
 */
export const SIMILARITY_THRESHOLDS = {
  TYPE_1: 0.99,
  TYPE_2: 0.95,
  TYPE_3: 0.85,
  TYPE_4: 0.7,
} as const;

/**
 * Supported file extensions for each language.
 */
export const LANGUAGE_EXTENSIONS: Record<string, readonly string[]> = {
  typescript: ['.ts', '.tsx', '.mts', '.cts'],
  javascript: ['.js', '.jsx', '.mjs', '.cjs'],
  python: ['.py', '.pyi', '.pyw'],
  java: ['.java'],
  go: ['.go'],
  rust: ['.rs'],
  c: ['.c', '.h'],
  cpp: ['.cpp', '.cc', '.cxx', '.hpp', '.hh', '.hxx'],
  csharp: ['.cs'],
  ruby: ['.rb', '.rake', '.gemspec'],
  php: ['.php', '.phtml', '.php3', '.php4', '.php5'],
  swift: ['.swift'],
  kotlin: ['.kt', '.kts'],
  scala: ['.scala', '.sc'],
  r: ['.r', '.R'],
  shell: ['.sh', '.bash', '.zsh'],
  sql: ['.sql'],
  lua: ['.lua'],
  perl: ['.pl', '.pm'],
  objectivec: ['.m', '.mm'],
  elixir: ['.ex', '.exs'],
  erlang: ['.erl', '.hrl'],
  haskell: ['.hs', '.lhs'],
  clojure: ['.clj', '.cljs', '.cljc'],
  fsharp: ['.fs', '.fsi', '.fsx'],
} as const;

/**
 * Default patterns to ignore during scanning.
 */
export const DEFAULT_IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/.git/**',
  '**/.svn/**',
  '**/.hg/**',
  '**/vendor/**',
  '**/__pycache__/**',
  '**/.cache/**',
  '**/coverage/**',
  '**/*.min.js',
  '**/*.min.css',
  '**/*.map',
  '**/package-lock.json',
  '**/yarn.lock',
  '**/pnpm-lock.yaml',
  '**/Gemfile.lock',
  '**/Cargo.lock',
  '**/go.sum',
] as const;

/**
 * NLCI configuration file names.
 */
export const CONFIG_FILE_NAMES = [
  'nlci.config.js',
  'nlci.config.ts',
  'nlci.config.mjs',
  'nlci.config.json',
  '.nlcirc',
  '.nlcirc.json',
] as const;

/**
 * Index file names.
 */
export const INDEX_FILE_NAME = '.nlci-index';
export const INDEX_METADATA_FILE = '.nlci-meta.json';

/**
 * HTTP ports.
 */
export const DEFAULT_SERVER_PORT = 3000;
export const DEFAULT_API_PORT = 3001;

/**
 * Exit codes.
 */
export const EXIT_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  INVALID_ARGS: 2,
  CONFIG_ERROR: 3,
  INDEX_ERROR: 4,
  QUERY_ERROR: 5,
} as const;
