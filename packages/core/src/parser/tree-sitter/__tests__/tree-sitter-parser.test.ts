/**
 * Tests for Tree-sitter Parser
 *
 * Uses mocked web-tree-sitter to avoid WASM loading issues in Node.js.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// Counter for unique node IDs
let nodeIdCounter = 0;

// Helper to create mock AST nodes from source code
function createMockTree(source: string, hasSyntaxError = false) {
  const nodes: any[] = [];
  const lines = source.split('\n');
  nodeIdCounter = 0; // Reset counter for each tree

  // Simple pattern matching for test purposes
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] || '';

    // TypeScript/JavaScript patterns
    if (/^\s*(export\s+)?(async\s+)?function\s+(\w+)/.test(line)) {
      const match = line.match(/function\s+(\w+)/);
      nodes.push(createMockNode('function_declaration', match?.[1] || 'unknown', i, source));
    }
    // Note: class_declaration for TS/JS is handled later with C++/Python exclusion logic
    if (/^\s*(export\s+)?interface\s+(\w+)/.test(line)) {
      const match = line.match(/interface\s+(\w+)/);
      nodes.push(createMockNode('interface_declaration', match?.[1] || 'unknown', i, source));
    }
    if (/^\s*(export\s+)?type\s+(\w+)/.test(line) && line.includes('=')) {
      const match = line.match(/type\s+(\w+)/);
      nodes.push(createMockNode('type_alias_declaration', match?.[1] || 'unknown', i, source));
    }
    if (/^\s*(export\s+)?enum\s+(\w+)/.test(line)) {
      const match = line.match(/enum\s+(\w+)/);
      nodes.push(createMockNode('enum_declaration', match?.[1] || 'unknown', i, source));
    }
    // Arrow functions: const x = ... =>
    if (/^\s*(export\s+)?const\s+(\w+)\s*=/.test(line) && line.includes('=>')) {
      const match = line.match(/const\s+(\w+)/);
      nodes.push(createMockNode('arrow_function', match?.[1] || 'unknown', i, source));
    }
    // TypeScript/JavaScript class - has class keyword without Java/Python indicators
    if (
      /^\s*(export\s+)?(abstract\s+)?class\s+(\w+)/.test(line) &&
      !line.includes(':') &&
      !source.includes('private:') &&
      !source.includes('public:')
    ) {
      const match = line.match(/class\s+(\w+)/);
      nodes.push(createMockNode('class_declaration', match?.[1] || 'unknown', i, source));
    }

    // Python patterns - def at start of line (not methods)
    if (/^def\s+(\w+)/.test(line)) {
      const match = line.match(/def\s+(\w+)/);
      nodes.push(createMockNode('function_definition', match?.[1] || 'unknown', i, source));
    }
    // Python class - must have colon at end (not C++/JS/Java)
    if (/^class\s+(\w+)[^{]*:/.test(line)) {
      const match = line.match(/class\s+(\w+)/);
      nodes.push(createMockNode('class_definition', match?.[1] || 'unknown', i, source));
    }

    // Java patterns - must have public/private access modifier to distinguish from JS
    if (/^\s*(public|private)\s+(static\s+)?(final\s+)?class\s+(\w+)/.test(line)) {
      const match = line.match(/class\s+(\w+)/);
      nodes.push(createMockNode('class_declaration', match?.[1] || 'unknown', i, source));
    }
    if (/^\s*public\s+interface\s+(\w+)/.test(line)) {
      // Java interface (requires public keyword)
      const match = line.match(/interface\s+(\w+)/);
      nodes.push(createMockNode('interface_declaration', match?.[1] || 'unknown', i, source));
    }

    // Go patterns
    if (/^\s*func\s+(\w+)/.test(line)) {
      const match = line.match(/func\s+(\w+)/);
      nodes.push(createMockNode('function_declaration', match?.[1] || 'unknown', i, source));
    }
    if (/^\s*type\s+(\w+)\s+struct/.test(line)) {
      const match = line.match(/type\s+(\w+)/);
      nodes.push(createMockNode('struct_type', match?.[1] || 'unknown', i, source));
    }
    if (/^\s*type\s+(\w+)\s+interface/.test(line)) {
      const match = line.match(/type\s+(\w+)/);
      nodes.push(createMockNode('interface_type', match?.[1] || 'unknown', i, source));
    }

    // Rust patterns
    if (/^\s*(pub\s+)?(async\s+)?fn\s+(\w+)/.test(line)) {
      const match = line.match(/fn\s+(\w+)/);
      nodes.push(createMockNode('function_item', match?.[1] || 'unknown', i, source));
    }
    if (/^\s*(pub\s+)?struct\s+(\w+)/.test(line)) {
      const match = line.match(/struct\s+(\w+)/);
      nodes.push(createMockNode('struct_item', match?.[1] || 'unknown', i, source));
    }
    if (/^\s*(pub\s+)?trait\s+(\w+)/.test(line)) {
      const match = line.match(/trait\s+(\w+)/);
      nodes.push(createMockNode('trait_item', match?.[1] || 'unknown', i, source));
    }
    if (/^\s*(pub\s+)?impl\s+/.test(line)) {
      nodes.push(createMockNode('impl_item', 'impl', i, source));
    }

    // C/C++ patterns
    if (/^\s*#include/.test(line)) continue;
    // C function: type name(...) - exclude keywords and Python/JS constructs
    if (/^\s*(\w+)\s+(\w+)\s*\([^)]*\)\s*\{?/.test(line)) {
      const match = line.match(/(\w+)\s+(\w+)\s*\(/);
      if (
        match &&
        !['if', 'while', 'for', 'switch', 'return', 'def', 'class', 'function', 'async'].includes(
          match[1]!
        ) &&
        !['if', 'while', 'for', 'switch', 'return'].includes(match[2]!)
      ) {
        nodes.push(createMockNode('function_definition', match[2] || 'unknown', i, source));
      }
    }
    if (/^\s*struct\s+(\w+)/.test(line)) {
      const match = line.match(/struct\s+(\w+)/);
      nodes.push(createMockNode('struct_specifier', match?.[1] || 'unknown', i, source));
    }
    // C++ class - must have private:/public:/protected: on following lines
    // For simplicity, just check that it's 'class X {' with no 'export' and file would be .cpp/.h
    // This pattern is intentionally restrictive to avoid matching JS/TS classes
    if (
      /^class\s+(\w+)\s*\{?/.test(line) &&
      !line.includes('export') &&
      (source.includes('private:') || source.includes('public:') || source.includes('protected:'))
    ) {
      const match = line.match(/class\s+(\w+)/);
      nodes.push(createMockNode('class_specifier', match?.[1] || 'unknown', i, source));
    }
  }

  function createMockNode(type: string, name: string, startLine: number, text: string) {
    const nodeId = ++nodeIdCounter;
    const identifierId = ++nodeIdCounter;

    const identifierNode: any = {
      id: identifierId,
      type: 'identifier',
      text: name,
      startPosition: { row: startLine, column: 0 },
      endPosition: { row: startLine, column: name.length },
      childCount: 0,
      children: [],
      namedChildCount: 0,
      namedChildren: [],
      parent: null as any,
      child: () => null,
      namedChild: () => null,
      childForFieldName: () => null,
      descendantsOfType: () => [],
    };

    const children = [identifierNode];
    const node: any = {
      id: nodeId,
      type,
      text: text,
      startPosition: { row: startLine, column: 0 },
      endPosition: { row: startLine + 3, column: 1 },
      childCount: 1,
      children,
      namedChildCount: 1,
      namedChildren: children,
      parent: null as any,
      child: (index: number) => children[index] || null,
      namedChild: (index: number) => children[index] || null,
      childForFieldName: (field: string) => {
        if (field === 'name') return identifierNode;
        return null;
      },
      descendantsOfType: (types: string[]) => {
        if (types.includes('identifier')) return [identifierNode];
        return [];
      },
    };

    identifierNode.parent = node;
    return node;
  }

  // Create root node
  const rootId = ++nodeIdCounter;
  const rootNode: any = {
    id: rootId,
    type: 'program',
    text: source,
    startPosition: { row: 0, column: 0 },
    endPosition: { row: lines.length, column: 0 },
    childCount: nodes.length,
    children: nodes,
    namedChildCount: nodes.length,
    namedChildren: nodes,
    hasError: hasSyntaxError,
    parent: null,
    child: (index: number) => nodes[index] || null,
    namedChild: (index: number) => nodes[index] || null,
    childForFieldName: () => null,
    descendantsOfType: (types: string[]) => nodes.filter((n) => types.includes(n.type)),
  };

  nodes.forEach((n) => (n.parent = rootNode));

  return {
    rootNode,
    delete: vi.fn(),
  };
}

// Mock web-tree-sitter
vi.mock('web-tree-sitter', () => {
  const Parser = vi.fn().mockImplementation(() => ({
    parse: vi.fn((source: string) => {
      // Detect actual syntax errors (unclosed braces, invalid tokens)
      const openBraces = (source.match(/\{/g) || []).length;
      const closeBraces = (source.match(/\}/g) || []).length;
      const openParens = (source.match(/\(/g) || []).length;
      const closeParens = (source.match(/\)/g) || []).length;
      const hasSyntaxError = openBraces !== closeBraces || openParens !== closeParens;
      return createMockTree(source, hasSyntaxError);
    }),
    setLanguage: vi.fn(),
    delete: vi.fn(),
  }));
  Parser.init = vi.fn().mockResolvedValue(undefined);

  const Language = {
    load: vi.fn().mockResolvedValue({ name: 'mock-language' }),
  };

  return { Parser, Language };
});

import type { SupportedLanguage } from '../../../types/code-block.js';
import { TreeSitterParser } from '../tree-sitter-parser.js';

describe('TreeSitterParser', () => {
  let parser: TreeSitterParser;

  beforeAll(async () => {
    parser = new TreeSitterParser();
    await parser.initialize();
  });

  afterAll(() => {
    parser.clearCache();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      const newParser = new TreeSitterParser();
      await expect(newParser.initialize()).resolves.not.toThrow();
    });

    it('should only initialize once', async () => {
      const newParser = new TreeSitterParser();
      await newParser.initialize();
      await newParser.initialize(); // Should not throw
    });
  });

  describe('language detection', () => {
    it('should detect TypeScript from file extension', async () => {
      const source = `export function hello(): string { return 'hello'; }`;
      const result = await parser.parseAsync(source, 'test.ts');
      expect(result.errors.length).toBe(0);
    });

    it('should detect JavaScript from file extension', async () => {
      const source = `function hello() { return 'hello'; }`;
      const result = await parser.parseAsync(source, 'test.js');
      expect(result.errors.length).toBe(0);
    });

    it('should detect Python from file extension', async () => {
      const source = `def hello():\n    return 'hello'`;
      const result = await parser.parseAsync(source, 'test.py');
      expect(result.errors.length).toBe(0);
    });

    it('should use language override if provided', async () => {
      const source = `function hello() { return 'hello'; }`;
      const result = await parser.parseAsync(source, 'test.txt', 'javascript');
      expect(result.errors.length).toBe(0);
    });

    it('should return error for unknown file extension', async () => {
      const source = `some content`;
      const result = await parser.parseAsync(source, 'test.unknown');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]!.message).toContain('Cannot determine language');
    });
  });

  describe('TypeScript parsing', () => {
    it('should extract functions', async () => {
      const source = `
export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

function helper() {
  console.log('helper');
}
`;
      const result = await parser.parseAsync(source, 'test.ts');
      expect(result.errors.length).toBe(0);
      expect(result.blocks.length).toBeGreaterThan(0);

      const functions = result.blocks.filter((b) => b.blockType === 'function');
      expect(functions.length).toBe(2);
    });

    it('should extract classes', async () => {
      const source = `
export class Calculator {
  private value: number = 0;

  add(n: number): this {
    this.value += n;
    return this;
  }

  get result(): number {
    return this.value;
  }
}
`;
      const result = await parser.parseAsync(source, 'test.ts');
      expect(result.errors.length).toBe(0);

      const classes = result.blocks.filter((b) => b.blockType === 'class');
      expect(classes.length).toBe(1);
      expect(classes[0]!.name).toBe('Calculator');
    });

    it('should extract interfaces', async () => {
      const source = `
export interface User {
  id: number;
  name: string;
  email: string;
}

interface Admin extends User {
  permissions: string[];
}
`;
      const result = await parser.parseAsync(source, 'test.ts');
      expect(result.errors.length).toBe(0);

      const interfaces = result.blocks.filter((b) => b.blockType === 'interface');
      expect(interfaces.length).toBe(2);
    });

    it('should extract type aliases', async () => {
      const source = `
export type Status = 'pending' | 'active' | 'inactive';

type ResponseData<T> = {
  data: T;
  error?: string;
};
`;
      const result = await parser.parseAsync(source, 'test.ts');
      expect(result.errors.length).toBe(0);

      const types = result.blocks.filter((b) => b.blockType === 'type');
      expect(types.length).toBe(2);
    });

    it('should extract arrow functions', async () => {
      const source = `
export const add = (a: number, b: number): number => {
  return a + b;
};

const multiply = (a: number, b: number): number => a * b;
`;
      const result = await parser.parseAsync(source, 'test.ts');
      expect(result.errors.length).toBe(0);
      expect(result.blocks.length).toBeGreaterThan(0);
    });

    it('should handle syntax errors gracefully', async () => {
      const source = `
function broken( {
  return 
`;
      const result = await parser.parseAsync(source, 'test.ts');
      expect(result.errors.some((e) => e.message.includes('syntax error'))).toBe(true);
    });
  });

  describe('JavaScript parsing', () => {
    it('should extract functions', async () => {
      const source = `
function greet(name) {
  return 'Hello, ' + name + '!';
}

const add = function(a, b) {
  return a + b;
};
`;
      const result = await parser.parseAsync(source, 'test.js');
      expect(result.errors.length).toBe(0);

      const functions = result.blocks.filter((b) => b.blockType === 'function');
      expect(functions.length).toBeGreaterThan(0);
    });

    it('should extract classes', async () => {
      const source = `
class Animal {
  constructor(name) {
    this.name = name;
  }

  speak() {
    console.log(this.name + ' makes a sound.');
  }
}
`;
      const result = await parser.parseAsync(source, 'test.js');
      expect(result.errors.length).toBe(0);

      const classes = result.blocks.filter((b) => b.blockType === 'class');
      expect(classes.length).toBe(1);
      expect(classes[0]!.name).toBe('Animal');
    });
  });

  describe('Python parsing', () => {
    it('should extract functions', async () => {
      const source = `
def greet(name):
    """Greet a person."""
    return f'Hello, {name}!'

def add(a, b):
    return a + b
`;
      const result = await parser.parseAsync(source, 'test.py');
      expect(result.errors.length).toBe(0);

      const functions = result.blocks.filter((b) => b.blockType === 'function');
      expect(functions.length).toBe(2);
    });

    it('should extract classes', async () => {
      const source = `
class Calculator:
    """A simple calculator class."""
    
    def __init__(self):
        self.value = 0
    
    def add(self, n):
        self.value += n
        return self
`;
      const result = await parser.parseAsync(source, 'test.py');
      expect(result.errors.length).toBe(0);

      const classes = result.blocks.filter((b) => b.blockType === 'class');
      expect(classes.length).toBe(1);
      expect(classes[0]!.name).toBe('Calculator');
    });
  });

  describe('Java parsing', () => {
    it('should extract classes and methods', async () => {
      const source = `
public class Calculator {
    private int value;
    
    public Calculator() {
        this.value = 0;
    }
    
    public Calculator add(int n) {
        this.value += n;
        return this;
    }
    
    public int getResult() {
        return this.value;
    }
}
`;
      const result = await parser.parseAsync(source, 'Calculator.java');
      expect(result.errors.length).toBe(0);

      const classes = result.blocks.filter((b) => b.blockType === 'class');
      expect(classes.length).toBe(1);
      expect(classes[0]!.name).toBe('Calculator');
    });

    it('should extract interfaces', async () => {
      const source = `
public interface Greeter {
    String greet(String name);
    void sayGoodbye();
}
`;
      const result = await parser.parseAsync(source, 'Greeter.java');
      expect(result.errors.length).toBe(0);

      const interfaces = result.blocks.filter((b) => b.blockType === 'interface');
      expect(interfaces.length).toBe(1);
    });
  });

  describe('Go parsing', () => {
    it('should extract functions', async () => {
      const source = `
package main

import "fmt"

func greet(name string) string {
    return fmt.Sprintf("Hello, %s!", name)
}

func add(a, b int) int {
    return a + b
}
`;
      const result = await parser.parseAsync(source, 'main.go');
      expect(result.errors.length).toBe(0);

      const functions = result.blocks.filter((b) => b.blockType === 'function');
      expect(functions.length).toBeGreaterThan(0);
    });

    it('should extract structs', async () => {
      const source = `
package main

type Calculator struct {
    value int
}

func (c *Calculator) Add(n int) *Calculator {
    c.value += n
    return c
}
`;
      const result = await parser.parseAsync(source, 'calculator.go');
      expect(result.errors.length).toBe(0);

      const structs = result.blocks.filter((b) => b.blockType === 'struct');
      expect(structs.length).toBeGreaterThan(0);
    });
  });

  describe('Rust parsing', () => {
    it('should extract functions', async () => {
      const source = `
fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

pub fn add(a: i32, b: i32) -> i32 {
    a + b
}
`;
      const result = await parser.parseAsync(source, 'lib.rs');
      expect(result.errors.length).toBe(0);

      const functions = result.blocks.filter((b) => b.blockType === 'function');
      expect(functions.length).toBe(2);
    });

    it('should extract structs and impls', async () => {
      const source = `
struct Calculator {
    value: i32,
}

impl Calculator {
    fn new() -> Self {
        Calculator { value: 0 }
    }
    
    fn add(&mut self, n: i32) -> &mut Self {
        self.value += n;
        self
    }
}
`;
      const result = await parser.parseAsync(source, 'calculator.rs');
      expect(result.errors.length).toBe(0);

      const structs = result.blocks.filter((b) => b.blockType === 'struct');
      expect(structs.length).toBeGreaterThan(0);

      const impls = result.blocks.filter((b) => b.blockType === 'impl');
      expect(impls.length).toBeGreaterThan(0);
    });

    it('should extract traits', async () => {
      const source = `
pub trait Greeter {
    fn greet(&self, name: &str) -> String;
    fn say_goodbye(&self);
}
`;
      const result = await parser.parseAsync(source, 'greeter.rs');
      expect(result.errors.length).toBe(0);

      const traits = result.blocks.filter((b) => b.blockType === 'trait');
      expect(traits.length).toBe(1);
    });
  });

  describe('C parsing', () => {
    it('should extract functions', async () => {
      const source = `
#include <stdio.h>

int add(int a, int b) {
    return a + b;
}

void greet(const char* name) {
    printf("Hello, %s!\\n", name);
}
`;
      const result = await parser.parseAsync(source, 'main.c');
      expect(result.errors.length).toBe(0);

      const functions = result.blocks.filter((b) => b.blockType === 'function');
      expect(functions.length).toBeGreaterThan(0);
    });

    it('should extract structs', async () => {
      const source = `
struct Point {
    int x;
    int y;
};

struct Rectangle {
    struct Point origin;
    int width;
    int height;
};
`;
      const result = await parser.parseAsync(source, 'types.h');
      expect(result.errors.length).toBe(0);

      const structs = result.blocks.filter((b) => b.blockType === 'struct');
      expect(structs.length).toBeGreaterThan(0);
    });
  });

  describe('C++ parsing', () => {
    it('should extract classes', async () => {
      const source = `
class Calculator {
private:
    int value;

public:
    Calculator() : value(0) {}

    Calculator& add(int n) {
        value += n;
        return *this;
    }

    int getResult() const {
        return value;
    }
};
`;
      const result = await parser.parseAsync(source, 'calculator.cpp');
      expect(result.errors.length).toBe(0);

      const classes = result.blocks.filter((b) => b.blockType === 'class');
      expect(classes.length).toBe(1);
    });
  });

  describe('block extraction options', () => {
    it('should respect minimum block length', async () => {
      const shortParser = new TreeSitterParser({ minBlockLength: 100 });
      await shortParser.initialize();

      const source = `
function short() {
  return 1;
}

function longEnoughFunction() {
  // This is a longer function with more content
  const result = performComplexCalculation();
  return processResult(result);
}
`;
      const result = await shortParser.parseAsync(source, 'test.ts');
      // Short function should be filtered out
      expect(result.blocks.every((b) => b.content.length >= 100)).toBe(true);

      shortParser.clearCache();
    });
  });

  describe('preloading', () => {
    it('should preload multiple languages', async () => {
      const newParser = new TreeSitterParser();
      await newParser.initialize();
      await newParser.preloadLanguages(['typescript', 'javascript', 'python']);
      // Should not throw
      newParser.clearCache();
    });
  });

  describe('synchronous API', () => {
    it('should return placeholder for sync parse', () => {
      const result = parser.parse('function test() {}', 'test.ts');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]!.message).toContain('parseAsync');
    });

    it('should return error for unsupported language in sync parse', () => {
      const result = parser.parse('content', 'test.txt', 'unknown' as SupportedLanguage);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('code block metadata', () => {
    it('should include correct line numbers', async () => {
      const source = `
function first() {
  return 1;
}

function second() {
  return 2;
}
`;
      const result = await parser.parseAsync(source, 'test.ts');
      const functions = result.blocks.filter((b) => b.blockType === 'function');

      if (functions.length >= 2) {
        // First function should start around line 2
        expect(functions[0]!.startLine).toBeGreaterThanOrEqual(1);
        // Second function should start after first
        expect(functions[1]!.startLine).toBeGreaterThan(functions[0]!.startLine!);
      }
    });

    it('should include function names', async () => {
      const source = `
function namedFunction() {
  return 'named';
}
`;
      const result = await parser.parseAsync(source, 'test.ts');
      const fn = result.blocks.find((b) => b.name === 'namedFunction');
      expect(fn).toBeDefined();
    });

    it('should include file path', async () => {
      const source = `function test() { return 1; }`;
      const result = await parser.parseAsync(source, 'path/to/file.ts');
      expect(result.blocks.length).toBeGreaterThan(0);
      expect(result.blocks[0]!.filePath).toBe('path/to/file.ts');
    });

    it('should include language', async () => {
      const source = `function test() { return 1; }`;
      const result = await parser.parseAsync(source, 'test.ts');
      expect(result.blocks.length).toBeGreaterThan(0);
      expect(result.blocks[0]!.language).toBe('typescript');
    });
  });

  describe('performance', () => {
    it('should record parse duration', async () => {
      const source = `function test() { return 1; }`;
      const result = await parser.parseAsync(source, 'test.ts');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });
});
