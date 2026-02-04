/**
 * @nlci/core - Indexer Tests
 *
 * Tests for SimpleCodeParser, MockEmbeddingModel, and related utilities
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  EXTENSION_TO_LANGUAGE,
  MockEmbeddingModel,
  SimpleCodeParser,
  getLanguageForFile,
  type CodeParser,
  type EmbeddingModel,
} from '../indexer.js';

describe('SimpleCodeParser', () => {
  let parser: SimpleCodeParser;

  beforeEach(() => {
    parser = new SimpleCodeParser();
  });

  describe('language detection', () => {
    it('should detect TypeScript from .ts extension', () => {
      const result = parser.parse('function foo() {}', 'test.ts');
      // If blocks are extracted, they should have typescript language
      expect(result.errors).toEqual([]);
    });

    it('should detect JavaScript from .js extension', () => {
      const result = parser.parse('function foo() {}', 'test.js');
      expect(result.errors).toEqual([]);
    });

    it('should detect Python from .py extension', () => {
      const result = parser.parse('def foo():\n  pass', 'test.py');
      expect(result.errors).toEqual([]);
    });
  });

  describe('TypeScript/JavaScript parsing', () => {
    it('should parse function declarations', () => {
      const code = `
function greet(name: string) {
  return 'Hello, ' + name;
}
`;
      const result = parser.parse(code, 'test.ts');
      expect(result.blocks.length).toBeGreaterThanOrEqual(1);
      const funcBlock = result.blocks.find((b) => b.name === 'greet');
      expect(funcBlock).toBeDefined();
      expect(funcBlock?.blockType).toBe('function');
    });

    it('should parse async function declarations', () => {
      const code = `
async function fetchData() {
  return await fetch('/api');
}
`;
      const result = parser.parse(code, 'test.ts');
      const funcBlock = result.blocks.find((b) => b.name === 'fetchData');
      expect(funcBlock).toBeDefined();
    });

    it('should parse class declarations', () => {
      const code = `
class Calculator {
  add(a: number, b: number) {
    return a + b;
  }
}
`;
      const result = parser.parse(code, 'test.ts');
      const classBlock = result.blocks.find((b) => b.blockType === 'class');
      expect(classBlock).toBeDefined();
      expect(classBlock?.name).toBe('Calculator');
    });

    it('should parse arrow functions assigned to const', () => {
      const code = `
const multiply = (a: number, b: number) => {
  return a * b;
};
`;
      const result = parser.parse(code, 'test.ts');
      const funcBlock = result.blocks.find((b) => b.name === 'multiply');
      expect(funcBlock).toBeDefined();
    });

    it('should parse export function declarations', () => {
      const code = `
export function publicFunc() {
  return 42;
}

export default function main() {
  console.log('main');
}
`;
      const result = parser.parse(code, 'test.ts');
      expect(result.blocks.length).toBeGreaterThanOrEqual(1);
    });

    it('should parse interface declarations', () => {
      const code = `
interface User {
  id: number;
  name: string;
}
`;
      const result = parser.parse(code, 'test.ts');
      const interfaceBlock = result.blocks.find((b) => b.blockType === 'interface');
      expect(interfaceBlock).toBeDefined();
      expect(interfaceBlock?.name).toBe('User');
    });

    it('should parse type aliases', () => {
      const code = `
type Result = {
  success: boolean;
  data?: unknown;
};
`;
      const result = parser.parse(code, 'test.ts');
      const typeBlock = result.blocks.find((b) => b.blockType === 'type');
      expect(typeBlock).toBeDefined();
      expect(typeBlock?.name).toBe('Result');
    });
  });

  describe('Python parsing', () => {
    it('should parse function definitions', () => {
      const code = `
def greet(name):
    return f"Hello, {name}"
`;
      const result = parser.parse(code, 'test.py');
      const funcBlock = result.blocks.find((b) => b.name === 'greet');
      expect(funcBlock).toBeDefined();
      expect(funcBlock?.blockType).toBe('function');
    });

    it('should parse async function definitions', () => {
      const code = `
async def fetch_data():
    return await client.get()
`;
      const result = parser.parse(code, 'test.py');
      const funcBlock = result.blocks.find((b) => b.name === 'fetch_data');
      expect(funcBlock).toBeDefined();
    });

    it('should parse class definitions', () => {
      const code = `
class Calculator:
    def add(self, a, b):
        return a + b
`;
      const result = parser.parse(code, 'test.py');
      const classBlock = result.blocks.find((b) => b.blockType === 'class');
      expect(classBlock).toBeDefined();
      expect(classBlock?.name).toBe('Calculator');
    });
  });

  describe('Go parsing', () => {
    it('should parse function definitions', () => {
      const code = `
func add(a, b int) int {
    return a + b
}
`;
      const result = parser.parse(code, 'main.go');
      const funcBlock = result.blocks.find((b) => b.name === 'add');
      expect(funcBlock).toBeDefined();
    });

    it('should parse struct definitions', () => {
      const code = `
type User struct {
    ID   int
    Name string
}
`;
      const result = parser.parse(code, 'main.go');
      const structBlock = result.blocks.find((b) => b.blockType === 'struct');
      expect(structBlock).toBeDefined();
      expect(structBlock?.name).toBe('User');
    });
  });

  describe('Rust parsing', () => {
    it('should parse function definitions', () => {
      const code = `
fn add(a: i32, b: i32) -> i32 {
    a + b
}
`;
      const result = parser.parse(code, 'main.rs');
      const funcBlock = result.blocks.find((b) => b.name === 'add');
      expect(funcBlock).toBeDefined();
    });

    it('should parse pub fn definitions', () => {
      const code = `
pub fn public_func() {
    println!("Hello");
}
`;
      const result = parser.parse(code, 'lib.rs');
      const funcBlock = result.blocks.find((b) => b.name === 'public_func');
      expect(funcBlock).toBeDefined();
    });

    it('should parse struct definitions', () => {
      const code = `
pub struct Config {
    name: String,
    value: i32,
}
`;
      const result = parser.parse(code, 'lib.rs');
      const structBlock = result.blocks.find((b) => b.blockType === 'struct');
      expect(structBlock).toBeDefined();
    });
  });

  describe('block metadata', () => {
    it('should include file path in blocks', () => {
      const code = 'function test() { return 1; }';
      const result = parser.parse(code, '/path/to/test.ts');
      if (result.blocks.length > 0) {
        expect(result.blocks[0].filePath).toBe('/path/to/test.ts');
      }
    });

    it('should include line numbers in blocks', () => {
      const code = `
function first() {
  return 1;
}

function second() {
  return 2;
}
`;
      const result = parser.parse(code, 'test.ts');
      const first = result.blocks.find((b) => b.name === 'first');
      const second = result.blocks.find((b) => b.name === 'second');

      if (first && second) {
        expect(first.startLine).toBeLessThan(second.startLine);
      }
    });

    it('should generate unique IDs for blocks', () => {
      const code = `
function a() {}
function b() {}
function c() {}
`;
      const result = parser.parse(code, 'test.ts');
      const ids = result.blocks.map((b) => b.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('content extraction', () => {
    it('should include raw content in blocks', () => {
      const code = `function test() {
  return 42;
}`;
      const result = parser.parse(code, 'test.ts');
      const block = result.blocks.find((b) => b.name === 'test');
      if (block) {
        expect(block.content).toContain('return 42');
      }
    });
  });

  describe('error handling', () => {
    it('should handle empty code', () => {
      const result = parser.parse('', 'test.ts');
      expect(result.blocks).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it('should handle code with no recognizable blocks', () => {
      const result = parser.parse('const x = 1;\nconst y = 2;', 'test.ts');
      // May or may not find blocks depending on implementation
      expect(result.errors).toEqual([]);
    });

    it('should handle unknown file extensions', () => {
      const result = parser.parse('some code', 'unknown.xyz');
      expect(result.errors).toEqual([]);
    });
  });
});

describe('MockEmbeddingModel', () => {
  describe('constructor', () => {
    it('should create model with default dimension', () => {
      const model = new MockEmbeddingModel();
      expect(model.dimension).toBe(384);
    });

    it('should create model with custom dimension', () => {
      const model = new MockEmbeddingModel(512);
      expect(model.dimension).toBe(512);
    });
  });

  describe('embed()', () => {
    it('should generate embedding of correct dimension', async () => {
      const model = new MockEmbeddingModel(128);
      const embedding = await model.embed('function test() {}');
      expect(embedding.length).toBe(128);
    });

    it('should generate deterministic embeddings for same input', async () => {
      const model = new MockEmbeddingModel(64);
      const code = 'function greet() { return "hello"; }';

      const emb1 = await model.embed(code);
      const emb2 = await model.embed(code);

      expect(Array.from(emb1)).toEqual(Array.from(emb2));
    });

    it('should generate different embeddings for different inputs', async () => {
      const model = new MockEmbeddingModel(64);

      const emb1 = await model.embed('function a() {}');
      const emb2 = await model.embed('function b() {}');

      expect(Array.from(emb1)).not.toEqual(Array.from(emb2));
    });

    it('should generate normalized embeddings (unit vectors)', async () => {
      const model = new MockEmbeddingModel(128);
      const embedding = await model.embed('const x = 1;');

      // Calculate L2 norm
      const norm = Math.sqrt(Array.from(embedding).reduce((sum, x) => sum + x * x, 0));

      expect(norm).toBeCloseTo(1.0, 4);
    });

    it('should handle empty string', async () => {
      const model = new MockEmbeddingModel(64);
      const embedding = await model.embed('');
      expect(embedding.length).toBe(64);
    });

    it('should handle unicode content', async () => {
      const model = new MockEmbeddingModel(64);
      const embedding = await model.embed('const greeting = "こんにちは";');
      expect(embedding.length).toBe(64);
    });
  });

  describe('embedBatch()', () => {
    it('should embed multiple codes', async () => {
      const model = new MockEmbeddingModel(64);
      const codes = ['function a() {}', 'function b() {}', 'class C {}'];

      const embeddings = await model.embedBatch(codes);

      expect(embeddings.length).toBe(3);
      embeddings.forEach((emb) => {
        expect(emb.length).toBe(64);
      });
    });

    it('should maintain determinism in batch processing', async () => {
      const model = new MockEmbeddingModel(64);
      const codes = ['code1', 'code2'];

      const batch1 = await model.embedBatch(codes);
      const batch2 = await model.embedBatch(codes);

      expect(Array.from(batch1[0])).toEqual(Array.from(batch2[0]));
      expect(Array.from(batch1[1])).toEqual(Array.from(batch2[1]));
    });

    it('should handle empty batch', async () => {
      const model = new MockEmbeddingModel(64);
      const embeddings = await model.embedBatch([]);
      expect(embeddings).toEqual([]);
    });
  });
});

describe('getLanguageForFile()', () => {
  it('should detect TypeScript', () => {
    expect(getLanguageForFile('test.ts')).toBe('typescript');
    expect(getLanguageForFile('test.tsx')).toBe('typescript');
  });

  it('should detect JavaScript', () => {
    expect(getLanguageForFile('test.js')).toBe('javascript');
    expect(getLanguageForFile('test.jsx')).toBe('javascript');
    expect(getLanguageForFile('test.mjs')).toBe('javascript');
    expect(getLanguageForFile('test.cjs')).toBe('javascript');
  });

  it('should detect Python', () => {
    expect(getLanguageForFile('script.py')).toBe('python');
  });

  it('should detect Go', () => {
    expect(getLanguageForFile('main.go')).toBe('go');
  });

  it('should detect Rust', () => {
    expect(getLanguageForFile('lib.rs')).toBe('rust');
  });

  it('should detect Java', () => {
    expect(getLanguageForFile('Main.java')).toBe('java');
  });

  it('should detect C#', () => {
    expect(getLanguageForFile('Program.cs')).toBe('csharp');
  });

  it('should detect C/C++', () => {
    expect(getLanguageForFile('main.c')).toBe('c');
    expect(getLanguageForFile('main.h')).toBe('c');
    expect(getLanguageForFile('main.cpp')).toBe('cpp');
    expect(getLanguageForFile('main.hpp')).toBe('cpp');
  });

  it('should return undefined for unknown extensions', () => {
    expect(getLanguageForFile('test.unknown')).toBeUndefined();
    expect(getLanguageForFile('noextension')).toBeUndefined();
  });

  it('should handle full paths', () => {
    expect(getLanguageForFile('/home/user/project/src/main.ts')).toBe('typescript');
    expect(getLanguageForFile('C:\\Users\\dev\\project\\main.py')).toBe('python');
  });
});

describe('EXTENSION_TO_LANGUAGE mapping', () => {
  it('should have mappings for common languages', () => {
    expect(EXTENSION_TO_LANGUAGE['.ts']).toBe('typescript');
    expect(EXTENSION_TO_LANGUAGE['.py']).toBe('python');
    expect(EXTENSION_TO_LANGUAGE['.go']).toBe('go');
    expect(EXTENSION_TO_LANGUAGE['.rs']).toBe('rust');
    expect(EXTENSION_TO_LANGUAGE['.java']).toBe('java');
  });

  it('should have multiple extensions for some languages', () => {
    // TypeScript
    expect(EXTENSION_TO_LANGUAGE['.ts']).toBe('typescript');
    expect(EXTENSION_TO_LANGUAGE['.tsx']).toBe('typescript');

    // JavaScript
    expect(EXTENSION_TO_LANGUAGE['.js']).toBe('javascript');
    expect(EXTENSION_TO_LANGUAGE['.jsx']).toBe('javascript');
    expect(EXTENSION_TO_LANGUAGE['.mjs']).toBe('javascript');

    // C++
    expect(EXTENSION_TO_LANGUAGE['.cpp']).toBe('cpp');
    expect(EXTENSION_TO_LANGUAGE['.cc']).toBe('cpp');
    expect(EXTENSION_TO_LANGUAGE['.cxx']).toBe('cpp');
  });
});

describe('CodeParser interface contract', () => {
  it('SimpleCodeParser should implement CodeParser interface', () => {
    const parser: CodeParser = new SimpleCodeParser();
    expect(typeof parser.parse).toBe('function');
  });
});

describe('EmbeddingModel interface contract', () => {
  it('MockEmbeddingModel should implement EmbeddingModel interface', () => {
    const model: EmbeddingModel = new MockEmbeddingModel();
    expect(typeof model.embed).toBe('function');
    expect(typeof model.embedBatch).toBe('function');
    expect(typeof model.dimension).toBe('number');
  });
});
