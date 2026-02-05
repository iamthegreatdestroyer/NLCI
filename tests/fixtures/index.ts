/**
 * Test fixtures and mock data for NLCI tests
 */

import type { CloneResult, CodeBlock, NlciConfig } from '@nlci/core';

/**
 * Sample code blocks for testing
 */
export const sampleCodeBlocks: CodeBlock[] = [
  {
    id: 'block-1',
    file: 'src/utils.ts',
    startLine: 1,
    endLine: 10,
    content: `function calculateSum(numbers: number[]): number {
  let total = 0;
  for (const num of numbers) {
    total += num;
  }
  return total;
}`,
    hash: 'abc123def456',
    embedding: new Float32Array(384).fill(0.5),
  },
  {
    id: 'block-2',
    file: 'src/helpers.ts',
    startLine: 15,
    endLine: 24,
    content: `function sumArray(items: number[]): number {
  let result = 0;
  for (const item of items) {
    result += item;
  }
  return result;
}`,
    hash: 'def456ghi789',
    embedding: new Float32Array(384).fill(0.48),
  },
  {
    id: 'block-3',
    file: 'src/math.ts',
    startLine: 5,
    endLine: 12,
    content: `function multiply(a: number, b: number): number {
  return a * b;
}

function divide(a: number, b: number): number {
  return a / b;
}`,
    hash: 'ghi789jkl012',
    embedding: new Float32Array(384).fill(0.1),
  },
];

/**
 * Sample clone results for testing
 */
export const sampleCloneResults: CloneResult[] = [
  {
    source: sampleCodeBlocks[0],
    target: sampleCodeBlocks[1],
    similarity: 0.95,
    cloneType: 'Type-2',
  },
  {
    source: sampleCodeBlocks[0],
    target: sampleCodeBlocks[2],
    similarity: 0.72,
    cloneType: 'Type-4',
  },
];

/**
 * Sample configurations for testing
 */
export const configurations = {
  default: {
    lsh: {
      numTables: 20,
      numBits: 12,
      embeddingDim: 384,
    },
    similarity: {
      threshold: 0.85,
      minLines: 5,
    },
  } as NlciConfig,

  fast: {
    lsh: {
      numTables: 10,
      numBits: 8,
      embeddingDim: 384,
    },
    similarity: {
      threshold: 0.85,
      minLines: 3,
    },
  } as NlciConfig,

  accurate: {
    lsh: {
      numTables: 30,
      numBits: 16,
      embeddingDim: 384,
    },
    similarity: {
      threshold: 0.9,
      minLines: 10,
    },
  } as NlciConfig,
};

/**
 * Sample TypeScript code snippets
 */
export const codeSnippets = {
  function: `function greet(name: string): string {
  return \`Hello, \${name}!\`;
}`,

  class: `class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }

  subtract(a: number, b: number): number {
    return a - b;
  }
}`,

  async: `async function fetchData(url: string): Promise<any> {
  const response = await fetch(url);
  return response.json();
}`,

  interface: `interface User {
  id: number;
  name: string;
  email: string;
}`,
};

/**
 * Create a mock code block
 */
export function createMockCodeBlock(overrides: Partial<CodeBlock> = {}): CodeBlock {
  return {
    id: 'mock-block-' + Math.random().toString(36).substr(2, 9),
    file: 'test.ts',
    startLine: 1,
    endLine: 10,
    content: 'function test() { return true; }',
    hash: 'mock-hash-' + Math.random().toString(36).substr(2, 9),
    embedding: new Float32Array(384).fill(0.5),
    ...overrides,
  };
}

/**
 * Create a mock clone result
 */
export function createMockCloneResult(overrides: Partial<CloneResult> = {}): CloneResult {
  return {
    source: createMockCodeBlock(),
    target: createMockCodeBlock(),
    similarity: 0.85,
    cloneType: 'Type-2',
    ...overrides,
  };
}

/**
 * Create a temporary test directory structure
 */
export const testProjectStructure = {
  'src/index.ts': `import { add } from './math';
console.log(add(2, 3));`,

  'src/math.ts': `export function add(a: number, b: number): number {
  return a + b;
}

export function subtract(a: number, b: number): number {
  return a - b;
}`,

  'src/utils.ts': `export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}`,

  'src/duplicate.ts': `export function add(a: number, b: number): number {
  return a + b;
}`,

  'package.json': `{
  "name": "test-project",
  "version": "1.0.0"
}`,

  '.gitignore': `node_modules/
dist/
*.log`,
};

/**
 * Mock LSH hash table data
 */
export function createMockHashTable(size: number = 100) {
  const table = new Map<string, string[]>();

  for (let i = 0; i < size; i++) {
    const hash = 'hash-' + i.toString(16).padStart(4, '0');
    const blockIds = ['block-' + i * 2, 'block-' + (i * 2 + 1)];
    table.set(hash, blockIds);
  }

  return table;
}

/**
 * Generate random embedding vector
 */
export function generateRandomEmbedding(dim: number = 384): Float32Array {
  const embedding = new Float32Array(dim);
  for (let i = 0; i < dim; i++) {
    embedding[i] = Math.random() * 2 - 1; // Range: -1 to 1
  }
  return embedding;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Performance measurement utilities
 */
export class PerformanceTracker {
  private measurements: Map<string, number[]> = new Map();

  start(label: string): () => void {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      if (!this.measurements.has(label)) {
        this.measurements.set(label, []);
      }
      this.measurements.get(label)!.push(duration);
    };
  }

  getStats(label: string) {
    const measurements = this.measurements.get(label) || [];

    if (measurements.length === 0) {
      return null;
    }

    const sorted = [...measurements].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
      count: sorted.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: sum / sorted.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  reset() {
    this.measurements.clear();
  }
}
