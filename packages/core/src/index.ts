/**
 * @nlci/core
 *
 * Neural-LSH Code Intelligence - Sub-linear code similarity detection
 *
 * Features:
 * - O(1) query time using Locality-Sensitive Hashing
 * - O(n) indexing time with neural embeddings
 * - Multi-probe LSH for improved recall
 * - Type-1 through Type-4 clone detection
 *
 * @example
 * ```typescript
 * import { NLCIEngine } from '@nlci/core';
 *
 * const engine = new NLCIEngine();
 *
 * // Index code
 * await engine.indexCode(sourceCode, 'path/to/file.ts');
 *
 * // Query for similar code
 * const results = await engine.query(queryCode);
 *
 * // Find all clones
 * const clusters = await engine.findAllClones();
 * ```
 *
 * @packageDocumentation
 */

// Types
export * from './types/index.js';

// LSH implementation
export * from './lsh/index.js';

// Engine
export * from './engine/index.js';

// Embeddings
export * from './embeddings/index.js';
