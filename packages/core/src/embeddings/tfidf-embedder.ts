/**
 * @nlci/core - TF-IDF Embedding Model
 *
 * Production-ready code embedding using TF-IDF with semantic tokenization.
 * Produces normalized dense vectors suitable for LSH similarity search.
 */

import type { EmbeddingModel } from '../engine/indexer.js';
import type { SupportedLanguage } from '../types/code-block.js';
import { CodeTokenizer, type Token } from './tokenizer.js';

/**
 * Configuration for TF-IDF embedding model.
 */
export interface TFIDFConfig {
  /** Embedding dimension (default: 384) */
  dimension?: number;

  /** Maximum vocabulary size (default: 50000) */
  maxVocabSize?: number;

  /** Minimum document frequency (default: 1) */
  minDocFreq?: number;

  /** Maximum document frequency ratio (default: 0.95) */
  maxDocFreqRatio?: number;

  /** N-gram size for structural patterns (default: 2) */
  ngramSize?: number;

  /** Language for tokenization (default: 'typescript') */
  language?: SupportedLanguage;

  /** Enable sub-linear TF scaling (default: true) */
  sublinearTf?: boolean;

  /** Use smooth IDF (default: true) */
  smoothIdf?: boolean;
}

/**
 * Default TF-IDF configuration.
 */
const DEFAULT_CONFIG: Required<TFIDFConfig> = {
  dimension: 384,
  maxVocabSize: 50000,
  minDocFreq: 1,
  maxDocFreqRatio: 0.95,
  ngramSize: 2,
  language: 'typescript',
  sublinearTf: true,
  smoothIdf: true,
};

/**
 * Vocabulary entry for TF-IDF.
 */
interface VocabEntry {
  /** Index in the vocabulary */
  index: number;
  /** Document frequency (number of documents containing this term) */
  docFreq: number;
  /** Inverse document frequency (computed lazily) */
  idf?: number;
}

/**
 * TF-IDF based code embedding model.
 *
 * This model:
 * 1. Tokenizes code using language-aware tokenization
 * 2. Builds/uses a vocabulary of seen terms
 * 3. Computes TF-IDF weighted sparse vectors
 * 4. Projects to dense vectors using random projection (LSH-friendly)
 * 5. Normalizes to unit vectors for cosine similarity
 */
export class TFIDFEmbedder implements EmbeddingModel {
  readonly dimension: number;

  private readonly config: Required<TFIDFConfig>;
  private readonly tokenizer: CodeTokenizer;

  // Vocabulary: term -> entry
  private vocabulary: Map<string, VocabEntry> = new Map();

  // Document count for IDF computation
  private documentCount: number = 0;

  // Random projection matrix for dimensionality reduction
  private projectionMatrix: Float32Array[] | null = null;

  // Seed for reproducible random projection
  private readonly seed: number;

  constructor(config: TFIDFConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.dimension = this.config.dimension;
    this.tokenizer = new CodeTokenizer(this.config.language);
    this.seed = 42; // Reproducible
    this.initializeProjectionMatrix();
  }

  /**
   * Initialize random projection matrix for dimensionality reduction.
   * Uses sparse random projection (Achlioptas) for efficiency.
   */
  private initializeProjectionMatrix(): void {
    // We'll project sparse TF-IDF vectors to dense vectors
    // Using sparse random projection: P(x=0) = 2/3, P(x=+1) = P(x=-1) = 1/6
    // For simplicity, we use Gaussian random projection which is more stable

    // Project from maxVocabSize to dimension
    const inputDim = this.config.maxVocabSize;
    this.projectionMatrix = new Array(this.dimension);

    let seed = this.seed;
    for (let i = 0; i < this.dimension; i++) {
      this.projectionMatrix[i] = new Float32Array(inputDim);
      for (let j = 0; j < inputDim; j++) {
        // Box-Muller for Gaussian random
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const u1 = seed / 0x7fffffff;
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const u2 = seed / 0x7fffffff;

        // Gaussian with mean 0, variance 1/inputDim (for variance preservation)
        const stddev = 1.0 / Math.sqrt(inputDim);
        const z = Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
        this.projectionMatrix[i][j] = z * stddev;
      }
    }
  }

  /**
   * Generate embedding for a single code text.
   */
  async embed(code: string): Promise<Float32Array> {
    // Tokenize the code
    const tokens = this.tokenizer.tokenize(code);

    // Update document count
    this.documentCount++;

    // Get term frequencies
    const termFreqs = this.computeTermFrequencies(tokens);

    // Update vocabulary with new terms
    this.updateVocabulary(termFreqs);

    // Compute TF-IDF sparse vector
    const tfidfVector = this.computeTFIDF(termFreqs);

    // Project to dense vector
    const denseVector = this.projectToDense(tfidfVector);

    // Normalize to unit vector
    this.normalize(denseVector);

    return denseVector;
  }

  /**
   * Generate embeddings for multiple code texts.
   */
  async embedBatch(codes: string[]): Promise<Float32Array[]> {
    return Promise.all(codes.map((code) => this.embed(code)));
  }

  /**
   * Compute term frequencies from tokens.
   */
  private computeTermFrequencies(tokens: Token[]): Map<string, number> {
    const freqs = new Map<string, number>();

    // Count unigram frequencies
    for (const token of tokens) {
      const term = this.termKey(token);
      freqs.set(term, (freqs.get(term) || 0) + 1);
    }

    // Add n-gram frequencies for structural patterns
    if (this.config.ngramSize > 1) {
      const ngrams = this.tokenizer.extractNGrams(tokens, this.config.ngramSize);
      for (const ngram of ngrams) {
        freqs.set(ngram, (freqs.get(ngram) || 0) + 1);
      }
    }

    return freqs;
  }

  /**
   * Create a unique key for a token.
   */
  private termKey(token: Token): string {
    return `${token.type}:${token.value}`;
  }

  /**
   * Update vocabulary with new terms.
   */
  private updateVocabulary(termFreqs: Map<string, number>): void {
    for (const term of termFreqs.keys()) {
      if (!this.vocabulary.has(term)) {
        if (this.vocabulary.size < this.config.maxVocabSize) {
          this.vocabulary.set(term, {
            index: this.vocabulary.size,
            docFreq: 1,
          });
        }
      } else {
        const entry = this.vocabulary.get(term)!;
        entry.docFreq++;
        entry.idf = undefined; // Invalidate cached IDF
      }
    }
  }

  /**
   * Compute IDF for a term.
   */
  private getIDF(term: string): number {
    const entry = this.vocabulary.get(term);
    if (!entry) return 0;

    if (entry.idf === undefined) {
      if (this.config.smoothIdf) {
        // Smooth IDF: log((N + 1) / (df + 1)) + 1
        entry.idf = Math.log((this.documentCount + 1) / (entry.docFreq + 1)) + 1;
      } else {
        // Standard IDF: log(N / df) + 1
        entry.idf = Math.log(this.documentCount / entry.docFreq) + 1;
      }
    }

    return entry.idf;
  }

  /**
   * Compute TF-IDF sparse vector.
   */
  private computeTFIDF(termFreqs: Map<string, number>): Map<number, number> {
    const tfidf = new Map<number, number>();

    for (const [term, tf] of termFreqs) {
      const entry = this.vocabulary.get(term);
      if (!entry) continue;

      // Term frequency (optionally sub-linear)
      let termFreq = tf;
      if (this.config.sublinearTf) {
        termFreq = 1 + Math.log(tf);
      }

      // TF-IDF score
      const idf = this.getIDF(term);
      const score = termFreq * idf;

      if (score > 0) {
        tfidf.set(entry.index, score);
      }
    }

    return tfidf;
  }

  /**
   * Project sparse TF-IDF vector to dense vector using random projection.
   */
  private projectToDense(sparse: Map<number, number>): Float32Array {
    const dense = new Float32Array(this.dimension);

    if (!this.projectionMatrix) {
      this.initializeProjectionMatrix();
    }

    for (let i = 0; i < this.dimension; i++) {
      let sum = 0;
      for (const [index, value] of sparse) {
        if (index < this.config.maxVocabSize) {
          sum += value * this.projectionMatrix![i][index];
        }
      }
      dense[i] = sum;
    }

    return dense;
  }

  /**
   * Normalize vector to unit length.
   */
  private normalize(vector: Float32Array): void {
    let norm = 0;
    for (let i = 0; i < vector.length; i++) {
      norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm);

    if (norm > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= norm;
      }
    }
  }

  /**
   * Get vocabulary size.
   */
  get vocabSize(): number {
    return this.vocabulary.size;
  }

  /**
   * Get document count.
   */
  get numDocuments(): number {
    return this.documentCount;
  }

  /**
   * Export model state for persistence.
   */
  exportState(): {
    vocabulary: [string, VocabEntry][];
    documentCount: number;
    config: Required<TFIDFConfig>;
  } {
    return {
      vocabulary: Array.from(this.vocabulary.entries()),
      documentCount: this.documentCount,
      config: this.config,
    };
  }

  /**
   * Import model state from persistence.
   */
  importState(state: ReturnType<TFIDFEmbedder['exportState']>): void {
    this.vocabulary = new Map(state.vocabulary);
    this.documentCount = state.documentCount;
    // Config is immutable, so we don't import it
  }

  /**
   * Reset the model state.
   */
  reset(): void {
    this.vocabulary.clear();
    this.documentCount = 0;
  }
}

/**
 * Create a pre-configured TF-IDF embedder for code.
 */
export function createTFIDFEmbedder(
  language: SupportedLanguage = 'typescript',
  dimension: number = 384
): TFIDFEmbedder {
  return new TFIDFEmbedder({
    language,
    dimension,
    maxVocabSize: 50000,
    minDocFreq: 1,
    maxDocFreqRatio: 0.95,
    ngramSize: 2,
    sublinearTf: true,
    smoothIdf: true,
  });
}
