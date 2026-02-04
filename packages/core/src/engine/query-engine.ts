/**
 * @nlci/core - Query Engine
 *
 * High-level query interface for finding code clones and similar code.
 */

import type { LSHIndex, LSHQueryResult } from '../lsh/lsh-index.js';
import type {
  CloneCluster,
  CloneResult,
  CloneType,
  QueryOptions,
  QueryResult,
} from '../types/clone-result.js';
import { DEFAULT_QUERY_OPTIONS } from '../types/clone-result.js';
import type { CodeBlock } from '../types/code-block.js';
import type { EmbeddingModel } from './indexer.js';

/**
 * Query engine for finding similar code blocks.
 */
export class QueryEngine {
  private readonly index: LSHIndex;
  private readonly embeddingModel: EmbeddingModel;

  constructor(index: LSHIndex, embeddingModel: EmbeddingModel) {
    this.index = index;
    this.embeddingModel = embeddingModel;
  }

  /**
   * Queries for similar code blocks.
   *
   * @param code - The code to search for
   * @param options - Query options
   * @returns Query result with matches
   */
  async query(code: string, options: Partial<QueryOptions> = {}): Promise<QueryResult> {
    const opts = { ...DEFAULT_QUERY_OPTIONS, ...options };
    const startTime = performance.now();

    // Generate embedding for query
    const embedding = await this.embeddingModel.embed(code);

    // Query the LSH index
    const candidates = this.index.query(embedding, {
      maxResults: opts.maxResults * 2, // Get extra for filtering
      minSimilarity: opts.minSimilarity * 0.8, // Lower threshold, filter later
      computeActualSimilarity: true,
    });

    // Filter and classify results
    const clones = this.filterAndClassify(candidates, opts);

    // Limit results
    const limitedClones = clones.slice(0, opts.maxResults);

    const duration = performance.now() - startTime;

    return {
      query: code,
      clones: limitedClones,
      totalMatches: clones.length,
      duration,
    };
  }

  /**
   * Queries for similar code blocks using an existing block.
   *
   * @param blockId - ID of the block to find similar blocks for
   * @param options - Query options
   * @returns Query result with matches
   */
  async querySimilar(blockId: string, options: Partial<QueryOptions> = {}): Promise<QueryResult> {
    const opts = { ...DEFAULT_QUERY_OPTIONS, ...options };
    const startTime = performance.now();

    const embedding = this.index.getEmbedding(blockId);
    const block = this.index.get(blockId);

    if (!embedding || !block) {
      return {
        query: '',
        clones: [],
        totalMatches: 0,
        duration: performance.now() - startTime,
      };
    }

    // Query the LSH index
    const candidates = this.index.query(embedding, {
      maxResults: opts.maxResults * 2 + 1, // +1 for self
      minSimilarity: opts.minSimilarity * 0.8,
      computeActualSimilarity: true,
    });

    // Filter out self and classify
    const filteredCandidates = candidates.filter((c) => c.block.id !== blockId);
    const clones = this.filterAndClassify(filteredCandidates, opts);
    const limitedClones = clones.slice(0, opts.maxResults);

    const duration = performance.now() - startTime;

    return {
      query: block.content,
      clones: limitedClones,
      totalMatches: clones.length,
      duration,
    };
  }

  /**
   * Finds all clone clusters in the index.
   *
   * Uses a union-find based approach to group similar blocks.
   */
  async findAllClones(options: Partial<QueryOptions> = {}): Promise<CloneCluster[]> {
    const opts = { ...DEFAULT_QUERY_OPTIONS, ...options };
    const blocks = this.index.getAllBlocks();

    // Union-find for clustering
    const parent = new Map<string, string>();
    const rank = new Map<string, number>();

    const find = (x: string): string => {
      if (!parent.has(x)) {
        parent.set(x, x);
        rank.set(x, 0);
      }
      if (parent.get(x) !== x) {
        parent.set(x, find(parent.get(x)!));
      }
      return parent.get(x)!;
    };

    const union = (x: string, y: string): void => {
      const px = find(x);
      const py = find(y);
      if (px === py) return;

      const rx = rank.get(px) ?? 0;
      const ry = rank.get(py) ?? 0;

      if (rx < ry) {
        parent.set(px, py);
      } else if (rx > ry) {
        parent.set(py, px);
      } else {
        parent.set(py, px);
        rank.set(px, rx + 1);
      }
    };

    // Find similar pairs and union them
    const clonePairs: Array<{
      source: CodeBlock;
      target: CodeBlock;
      similarity: number;
      cloneType: CloneType;
    }> = [];

    for (const block of blocks) {
      const embedding = this.index.getEmbedding(block.id);
      if (!embedding) continue;

      const candidates = this.index.query(embedding, {
        maxResults: 50,
        minSimilarity: opts.minSimilarity,
        computeActualSimilarity: true,
      });

      for (const candidate of candidates) {
        if (candidate.block.id === block.id) continue;
        if (candidate.actualSimilarity && candidate.actualSimilarity >= opts.minSimilarity) {
          // Union the blocks
          union(block.id, candidate.block.id);

          // Record the pair
          clonePairs.push({
            source: block,
            target: candidate.block,
            similarity: candidate.actualSimilarity,
            cloneType: this.classifyCloneType(block, candidate.block, candidate.actualSimilarity),
          });
        }
      }
    }

    // Build clusters from union-find
    const clusters = new Map<
      string,
      {
        blocks: CodeBlock[];
        avgSimilarity: number;
        similaritySum: number;
        count: number;
      }
    >();

    for (const block of blocks) {
      const root = find(block.id);
      if (!clusters.has(root)) {
        clusters.set(root, {
          blocks: [],
          avgSimilarity: 0,
          similaritySum: 0,
          count: 0,
        });
      }
      clusters.get(root)!.blocks.push(block);
    }

    // Calculate average similarity for each cluster
    for (const pair of clonePairs) {
      const root = find(pair.source.id);
      const cluster = clusters.get(root);
      if (cluster) {
        cluster.similaritySum += pair.similarity;
        cluster.count++;
      }
    }

    // Filter to clusters with 2+ blocks and convert to result format
    const result: CloneCluster[] = [];

    for (const cluster of clusters.values()) {
      if (cluster.blocks.length < 2) continue;

      cluster.avgSimilarity = cluster.count > 0 ? cluster.similaritySum / cluster.count : 0;

      // Determine clone type for cluster
      let cloneType: CloneType = 'type-4';
      if (cluster.avgSimilarity >= 0.99) cloneType = 'type-1';
      else if (cluster.avgSimilarity >= 0.95) cloneType = 'type-2';
      else if (cluster.avgSimilarity >= 0.85) cloneType = 'type-3';

      result.push({
        id: `cluster-${result.length}`,
        blocks: cluster.blocks,
        cloneType,
        avgSimilarity: cluster.avgSimilarity,
      });
    }

    // Sort by cluster size
    result.sort((a, b) => b.blocks.length - a.blocks.length);

    return result;
  }

  /**
   * Filters candidates and classifies clone types.
   */
  private filterAndClassify(
    candidates: readonly LSHQueryResult[],
    options: QueryOptions
  ): CloneResult[] {
    const results: CloneResult[] = [];

    for (const candidate of candidates) {
      const similarity = candidate.actualSimilarity ?? candidate.estimatedSimilarity;

      if (similarity < (options.minSimilarity ?? 0.8)) continue;

      // Classify clone type
      const cloneType = this.classifyCloneTypeBySimilarity(similarity);

      // Filter by requested clone types
      if (options.cloneTypes && !options.cloneTypes.includes(cloneType)) {
        continue;
      }

      results.push({
        source: candidate.block,
        target: candidate.block,
        similarity,
        cloneType,
        metrics: {
          sharedTokens: 0, // Would need actual comparison
          totalTokens: candidate.block.tokenCount ?? 0,
          editDistance: 0,
        },
      });
    }

    return results;
  }

  /**
   * Classifies clone type by similarity score.
   */
  private classifyCloneTypeBySimilarity(similarity: number): CloneType {
    if (similarity >= 0.99) return 'type-1';
    if (similarity >= 0.95) return 'type-2';
    if (similarity >= 0.85) return 'type-3';
    return 'type-4';
  }

  /**
   * Classifies clone type by comparing two blocks.
   */
  private classifyCloneType(source: CodeBlock, target: CodeBlock, similarity: number): CloneType {
    // Check for exact match (Type-1)
    if (source.contentHash === target.contentHash) {
      return 'type-1';
    }

    // Use similarity for other types
    return this.classifyCloneTypeBySimilarity(similarity);
  }
}
