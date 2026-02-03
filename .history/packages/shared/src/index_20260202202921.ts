/**
 * @nlci/shared
 *
 * Shared utilities and constants for NLCI packages.
 *
 * @packageDocumentation
 */

// Result type
export {
  type Result,
  type Ok,
  type Err,
  ok,
  err,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
  map,
  mapErr,
  flatMap,
  tryAsync,
  trySync,
} from './result.js';

// Logger
export {
  Logger,
  logger,
  createLogger,
  type LogLevel,
  type LoggerConfig,
} from './logger.js';

// Utilities
export {
  generateId,
  hashString,
  hashStringHex,
  deepClone,
  deepMerge,
  debounce,
  throttle,
  retry,
  chunk,
  groupBy,
  deferred,
  measureTime,
  formatBytes,
  formatDuration,
  type Deferred,
} from './utils.js';

// Constants
export * from './constants.js';
