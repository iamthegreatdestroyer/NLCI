/**
 * @nlci/core - Clone Result Types
 *
 * Type definitions for clone detection results.
 */

import type { CodeBlock, SupportedLanguage } from './code-block.js';

/**
 * A detected code clone/similarity result.
 */
export interface CloneResult {
  /** The query code block */
  readonly query: CodeBlock;

  /** The matched code block */
  readonly match: CodeBlock;

  /** Similarity score between 0 and 1 */
  readonly similarity: number;

  /** Type of clone detected */
  readonly cloneType: CloneType;

  /** Confidence score for the detection */
  readonly confidence: number;

  /** Number of LSH tables that produced this match */
  readonly tableMatches: number;

  /** Time taken to find this match (milliseconds) */
  readonly queryTimeMs: number;
}

/**
 * Clone types based on the taxonomy of code clones.
 */
export type CloneType =
  | 'type-1' // Exact match (ignoring whitespace/comments)
  | 'type-2' // Parameterized (renamed identifiers)
  | 'type-3' // Near-miss (statements added/removed)
  | 'type-4'; // Semantic (different syntax, same functionality)

/**
 * Result of a clone detection query.
 */
export interface QueryResult {
  /** The query that was executed */
  readonly queryBlock: CodeBlock;

  /** All clone results sorted by similarity (descending) */
  readonly results: readonly CloneResult[];

  /** Total number of matches found */
  readonly totalMatches: number;

  /** Total query time in milliseconds */
  readonly totalQueryTimeMs: number;

  /** Number of LSH tables consulted */
  readonly tablesQueried: number;

  /** Number of candidate blocks retrieved before filtering */
  readonly candidatesRetrieved: number;

  /** Whether results were truncated due to limit */
  readonly truncated: boolean;
}

/**
 * Summary statistics for a codebase scan.
 */
export interface ScanSummary {
  /** Total files scanned */
  readonly filesScanned: number;

  /** Total code blocks indexed */
  readonly blocksIndexed: number;

  /** Total clone pairs detected */
  readonly clonePairsFound: number;

  /** Clone pairs by type */
  readonly clonesByType: Readonly<Record<CloneType, number>>;

  /** Languages encountered */
  readonly languages: readonly SupportedLanguage[];

  /** Total scan time in milliseconds */
  readonly scanTimeMs: number;

  /** Index build time in milliseconds */
  readonly indexBuildTimeMs: number;

  /** Average query time in milliseconds */
  readonly avgQueryTimeMs: number;
}

/**
 * A cluster of similar code blocks.
 */
export interface CloneCluster {
  /** Unique cluster identifier */
  readonly id: string;

  /** All code blocks in this cluster */
  readonly blocks: readonly CodeBlock[];

  /** Representative block for the cluster */
  readonly representative: CodeBlock;

  /** Average similarity within the cluster */
  readonly avgSimilarity: number;

  /** Clone type of this cluster */
  readonly cloneType: CloneType;

  /** Total lines of duplicated code */
  readonly duplicatedLines: number;
}

/**
 * Options for clone detection queries.
 */
export interface QueryOptions {
  /** Minimum similarity threshold (0-1), default 0.8 */
  minSimilarity?: number;

  /** Maximum number of results to return, default 100 */
  maxResults?: number;

  /** Clone types to include, default all */
  cloneTypes?: CloneType[];

  /** Languages to include, default all */
  languages?: SupportedLanguage[];

  /** File patterns to include (glob) */
  includePatterns?: string[];

  /** File patterns to exclude (glob) */
  excludePatterns?: string[];

  /** Whether to include the query block in results */
  includeSelf?: boolean;

  /** Timeout in milliseconds, default 30000 */
  timeoutMs?: number;
}

/**
 * Default query options.
 */
export const DEFAULT_QUERY_OPTIONS: Required<QueryOptions> = {
  minSimilarity: 0.8,
  maxResults: 100,
  cloneTypes: ['type-1', 'type-2', 'type-3', 'type-4'],
  languages: [],
  includePatterns: [],
  excludePatterns: [],
  includeSelf: false,
  timeoutMs: 30000,
};

/**
 * Merges user options with defaults.
 */
export function mergeQueryOptions(
  options?: QueryOptions,
): Required<QueryOptions> {
  return {
    ...DEFAULT_QUERY_OPTIONS,
    ...options,
  };
}
