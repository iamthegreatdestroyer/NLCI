/**
 * Tests for NodeExtractor
 *
 * Uses mocked web-tree-sitter to avoid WASM loading issues in Node.js.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// Counter for unique node IDs
let nodeIdCounter = 0;

// Helper to create mock AST nodes for different languages
function createMockTree(language: string, source: string) {
  // Reset counter for each tree creation
  nodeIdCounter = 0;

  // Parse source code into mock AST nodes based on simple pattern matching
  const nodes: any[] = [];
  const lines = source.split('\n');

  // Very basic pattern matching for test purposes
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] || '';

    // TypeScript/JavaScript patterns
    if (/^\s*(export\s+)?function\s+(\w+)/.test(line)) {
      const match = line.match(/function\s+(\w+)/);
      nodes.push(createMockNode('function_declaration', match?.[1] || 'unknown', i, source));
    }
    if (/^\s*(export\s+)?class\s+(\w+)/.test(line)) {
      const match = line.match(/class\s+(\w+)/);
      nodes.push(createMockNode('class_declaration', match?.[1] || 'unknown', i, source));
    }
    if (/^\s*(export\s+)?interface\s+(\w+)/.test(line)) {
      const match = line.match(/interface\s+(\w+)/);
      nodes.push(createMockNode('interface_declaration', match?.[1] || 'unknown', i, source));
    }
    if (/^\s*(export\s+)?type\s+(\w+)/.test(line)) {
      const match = line.match(/type\s+(\w+)/);
      nodes.push(createMockNode('type_alias_declaration', match?.[1] || 'unknown', i, source));
    }
    if (/^\s*(export\s+)?enum\s+(\w+)/.test(line)) {
      const match = line.match(/enum\s+(\w+)/);
      nodes.push(createMockNode('enum_declaration', match?.[1] || 'unknown', i, source));
    }

    // Python patterns - must require colon (Python class syntax)
    if (/^def\s+(\w+)/.test(line)) {
      const match = line.match(/def\s+(\w+)/);
      nodes.push(createMockNode('function_definition', match?.[1] || 'unknown', i, source));
    }
    if (/^class\s+(\w+)[^{]*:/.test(line)) {
      const match = line.match(/class\s+(\w+)/);
      nodes.push(createMockNode('class_definition', match?.[1] || 'unknown', i, source));
    }

    // Java patterns - require public keyword to distinguish from TS/JS
    if (/^\s*public\s+class\s+(\w+)/.test(line)) {
      const match = line.match(/class\s+(\w+)/);
      nodes.push(createMockNode('class_declaration', match?.[1] || 'unknown', i, source));
    }
    if (/^\s*public\s+interface\s+(\w+)/.test(line)) {
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

    // Rust patterns
    if (/^\s*(pub\s+)?fn\s+(\w+)/.test(line)) {
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
    if (/^\s*impl\s+/.test(line)) {
      // impl Trait for Type or impl Type
      const match = line.match(/impl\s+(\w+)/);
      nodes.push(createMockNode('impl_item', match?.[1] || 'unknown', i, source));
    }

    // C/C++ patterns
    if (/^\s*(\w+)\s+(\w+)\s*\([^)]*\)\s*\{/.test(line)) {
      const match = line.match(/(\w+)\s+(\w+)\s*\(/);
      if (match && !['if', 'while', 'for', 'switch'].includes(match[2]!)) {
        nodes.push(createMockNode('function_definition', match[2] || 'unknown', i, source));
      }
    }
    // C struct pattern
    if (/^\s*struct\s+(\w+)\s*\{/.test(line)) {
      const match = line.match(/struct\s+(\w+)/);
      nodes.push(createMockNode('struct_specifier', match?.[1] || 'unknown', i, source));
    }
    // C++ class pattern (has public:/private:/protected:)
    if (/^\s*class\s+(\w+)/.test(line) && source.includes('public:')) {
      const match = line.match(/class\s+(\w+)/);
      nodes.push(createMockNode('class_specifier', match?.[1] || 'unknown', i, source));
    }
  }

  function createMockNode(type: string, name: string, startLine: number, text: string) {
    // Unique ID for each node to prevent visited set collision
    const nodeId = nodeIdCounter++;

    // For mock purposes, assume each code block spans about 3 lines
    // This is a simplification for testing - real tree-sitter would have accurate positions
    const endLine = startLine + 2;
    const endColumn = 1; // Non-zero for column tests

    // Find the matching child node with the identifier
    const identifierNode: any = {
      id: nodeIdCounter++,
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
      endPosition: { row: endLine, column: endColumn },
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

  // Create root node containing all extracted nodes
  const rootNode: any = {
    type: 'program',
    text: source,
    startPosition: { row: 0, column: 0 },
    endPosition: { row: lines.length, column: 0 },
    childCount: nodes.length,
    children: nodes,
    namedChildCount: nodes.length,
    namedChildren: nodes,
    hasError: false,
    parent: null,
    child: (index: number) => nodes[index] || null,
    namedChild: (index: number) => nodes[index] || null,
    childForFieldName: () => null,
    descendantsOfType: (types: string[]) => {
      return nodes.filter((n) => types.includes(n.type));
    },
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
    parse: vi.fn((source: string) => createMockTree('generic', source)),
    setLanguage: vi.fn(),
    delete: vi.fn(),
  }));
  Parser.init = vi.fn().mockResolvedValue(undefined);

  const Language = {
    load: vi.fn().mockResolvedValue({ name: 'mock-language' }),
  };

  return { Parser, Language };
});

import { GrammarLoader } from '../grammar-loader.js';
import { NodeExtractor } from '../node-extractor.js';

describe('NodeExtractor', () => {
  let loader: GrammarLoader;

  beforeAll(async () => {
    loader = new GrammarLoader();
    await loader.initialize();
  });

  afterAll(() => {
    loader.clear();
  });

  describe('TypeScript extraction', () => {
    let extractor: NodeExtractor;

    beforeAll(() => {
      extractor = new NodeExtractor('typescript');
    });

    it('should extract function declarations', async () => {
      const source = `
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
`;
      const parser = await loader.getParser('typescript');
      const tree = parser.parse(source);
      const nodes = extractor.extract(tree.rootNode, source);

      const functions = nodes.filter((n) => n.type === 'function');
      expect(functions.length).toBe(1);
      expect(functions[0]!.name).toBe('greet');
      tree.delete();
    });

    it('should extract class declarations', async () => {
      const source = `
class Calculator {
  private value: number = 0;

  add(n: number): this {
    this.value += n;
    return this;
  }
}
`;
      const parser = await loader.getParser('typescript');
      const tree = parser.parse(source);
      const nodes = extractor.extract(tree.rootNode, source);

      const classes = nodes.filter((n) => n.type === 'class');
      expect(classes.length).toBe(1);
      expect(classes[0]!.name).toBe('Calculator');
      tree.delete();
    });

    it('should extract interface declarations', async () => {
      const source = `
interface User {
  id: number;
  name: string;
}
`;
      const parser = await loader.getParser('typescript');
      const tree = parser.parse(source);
      const nodes = extractor.extract(tree.rootNode, source);

      const interfaces = nodes.filter((n) => n.type === 'interface');
      expect(interfaces.length).toBe(1);
      expect(interfaces[0]!.name).toBe('User');
      tree.delete();
    });

    it('should extract type alias declarations', async () => {
      const source = `
type Status = 'pending' | 'active';
`;
      const parser = await loader.getParser('typescript');
      const tree = parser.parse(source);
      const nodes = extractor.extract(tree.rootNode, source);

      const types = nodes.filter((n) => n.type === 'type');
      expect(types.length).toBe(1);
      expect(types[0]!.name).toBe('Status');
      tree.delete();
    });

    it('should extract enum declarations', async () => {
      const source = `
enum Color {
  Red,
  Green,
  Blue
}
`;
      const parser = await loader.getParser('typescript');
      const tree = parser.parse(source);
      const nodes = extractor.extract(tree.rootNode, source);

      const enums = nodes.filter((n) => n.type === 'enum');
      expect(enums.length).toBe(1);
      expect(enums[0]!.name).toBe('Color');
      tree.delete();
    });

    it('should include line numbers', async () => {
      const source = `
function first() {
  return 1;
}

function second() {
  return 2;
}
`;
      const parser = await loader.getParser('typescript');
      const tree = parser.parse(source);
      const nodes = extractor.extract(tree.rootNode, source);

      // The source starts with a blank line, so 'function first()' is on row 1 (0-indexed)
      // NodeExtractor adds 1 for 1-indexed lines, so startLine should be 2
      expect(nodes[0]!.startLine).toBe(2);
      expect(nodes[0]!.endLine).toBeGreaterThanOrEqual(3);

      if (nodes.length > 1) {
        expect(nodes[1]!.startLine).toBeGreaterThan(nodes[0]!.endLine);
      }
      tree.delete();
    });
  });

  describe('JavaScript extraction', () => {
    let extractor: NodeExtractor;

    beforeAll(() => {
      extractor = new NodeExtractor('javascript');
    });

    it('should extract function declarations', async () => {
      const source = `
function greet(name) {
  return 'Hello, ' + name + '!';
}
`;
      const parser = await loader.getParser('javascript');
      const tree = parser.parse(source);
      const nodes = extractor.extract(tree.rootNode, source);

      const functions = nodes.filter((n) => n.type === 'function');
      expect(functions.length).toBe(1);
      expect(functions[0]!.name).toBe('greet');
      tree.delete();
    });

    it('should extract class declarations', async () => {
      const source = `
class Animal {
  constructor(name) {
    this.name = name;
  }
}
`;
      const parser = await loader.getParser('javascript');
      const tree = parser.parse(source);
      const nodes = extractor.extract(tree.rootNode, source);

      const classes = nodes.filter((n) => n.type === 'class');
      expect(classes.length).toBe(1);
      expect(classes[0]!.name).toBe('Animal');
      tree.delete();
    });
  });

  describe('Python extraction', () => {
    let extractor: NodeExtractor;

    beforeAll(() => {
      extractor = new NodeExtractor('python');
    });

    it('should extract function definitions', async () => {
      const source = `
def greet(name):
    return f'Hello, {name}!'
`;
      const parser = await loader.getParser('python');
      const tree = parser.parse(source);
      const nodes = extractor.extract(tree.rootNode, source);

      const functions = nodes.filter((n) => n.type === 'function');
      expect(functions.length).toBe(1);
      expect(functions[0]!.name).toBe('greet');
      tree.delete();
    });

    it('should extract class definitions', async () => {
      const source = `
class Calculator:
    def __init__(self):
        self.value = 0
`;
      const parser = await loader.getParser('python');
      const tree = parser.parse(source);
      const nodes = extractor.extract(tree.rootNode, source);

      const classes = nodes.filter((n) => n.type === 'class');
      expect(classes.length).toBe(1);
      expect(classes[0]!.name).toBe('Calculator');
      tree.delete();
    });
  });

  describe('Java extraction', () => {
    let extractor: NodeExtractor;

    beforeAll(() => {
      extractor = new NodeExtractor('java');
    });

    it('should extract class declarations', async () => {
      const source = `
public class Calculator {
    private int value;
    
    public Calculator() {
        this.value = 0;
    }
}
`;
      const parser = await loader.getParser('java');
      const tree = parser.parse(source);
      const nodes = extractor.extract(tree.rootNode, source);

      const classes = nodes.filter((n) => n.type === 'class');
      expect(classes.length).toBe(1);
      expect(classes[0]!.name).toBe('Calculator');
      tree.delete();
    });

    it('should extract interface declarations', async () => {
      const source = `
public interface Greeter {
    String greet(String name);
}
`;
      const parser = await loader.getParser('java');
      const tree = parser.parse(source);
      const nodes = extractor.extract(tree.rootNode, source);

      const interfaces = nodes.filter((n) => n.type === 'interface');
      expect(interfaces.length).toBe(1);
      expect(interfaces[0]!.name).toBe('Greeter');
      tree.delete();
    });
  });

  describe('Go extraction', () => {
    let extractor: NodeExtractor;

    beforeAll(() => {
      extractor = new NodeExtractor('go');
    });

    it('should extract function declarations', async () => {
      const source = `
package main

func greet(name string) string {
    return "Hello, " + name + "!"
}
`;
      const parser = await loader.getParser('go');
      const tree = parser.parse(source);
      const nodes = extractor.extract(tree.rootNode, source);

      const functions = nodes.filter((n) => n.type === 'function');
      expect(functions.length).toBe(1);
      expect(functions[0]!.name).toBe('greet');
      tree.delete();
    });

    it('should extract struct declarations', async () => {
      const source = `
package main

type Calculator struct {
    value int
}
`;
      const parser = await loader.getParser('go');
      const tree = parser.parse(source);
      const nodes = extractor.extract(tree.rootNode, source);

      const structs = nodes.filter((n) => n.type === 'struct');
      expect(structs.length).toBe(1);
      tree.delete();
    });
  });

  describe('Rust extraction', () => {
    let extractor: NodeExtractor;

    beforeAll(() => {
      extractor = new NodeExtractor('rust');
    });

    it('should extract function declarations', async () => {
      const source = `
fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}
`;
      const parser = await loader.getParser('rust');
      const tree = parser.parse(source);
      const nodes = extractor.extract(tree.rootNode, source);

      const functions = nodes.filter((n) => n.type === 'function');
      expect(functions.length).toBe(1);
      expect(functions[0]!.name).toBe('greet');
      tree.delete();
    });

    it('should extract struct declarations', async () => {
      const source = `
struct Calculator {
    value: i32,
}
`;
      const parser = await loader.getParser('rust');
      const tree = parser.parse(source);
      const nodes = extractor.extract(tree.rootNode, source);

      const structs = nodes.filter((n) => n.type === 'struct');
      expect(structs.length).toBe(1);
      expect(structs[0]!.name).toBe('Calculator');
      tree.delete();
    });

    it('should extract impl blocks', async () => {
      const source = `
impl Calculator {
    fn new() -> Self {
        Calculator { value: 0 }
    }
}
`;
      const parser = await loader.getParser('rust');
      const tree = parser.parse(source);
      const nodes = extractor.extract(tree.rootNode, source);

      const impls = nodes.filter((n) => n.type === 'impl');
      expect(impls.length).toBe(1);
      tree.delete();
    });

    it('should extract trait declarations', async () => {
      const source = `
pub trait Greeter {
    fn greet(&self, name: &str) -> String;
}
`;
      const parser = await loader.getParser('rust');
      const tree = parser.parse(source);
      const nodes = extractor.extract(tree.rootNode, source);

      const traits = nodes.filter((n) => n.type === 'trait');
      expect(traits.length).toBe(1);
      expect(traits[0]!.name).toBe('Greeter');
      tree.delete();
    });
  });

  describe('C extraction', () => {
    let extractor: NodeExtractor;

    beforeAll(() => {
      extractor = new NodeExtractor('c');
    });

    it('should extract function definitions', async () => {
      const source = `
int add(int a, int b) {
    return a + b;
}
`;
      const parser = await loader.getParser('c');
      const tree = parser.parse(source);
      const nodes = extractor.extract(tree.rootNode, source);

      const functions = nodes.filter((n) => n.type === 'function');
      expect(functions.length).toBe(1);
      expect(functions[0]!.name).toBe('add');
      tree.delete();
    });

    it('should extract struct declarations', async () => {
      const source = `
struct Point {
    int x;
    int y;
};
`;
      const parser = await loader.getParser('c');
      const tree = parser.parse(source);
      const nodes = extractor.extract(tree.rootNode, source);

      const structs = nodes.filter((n) => n.type === 'struct');
      expect(structs.length).toBe(1);
      tree.delete();
    });
  });

  describe('C++ extraction', () => {
    let extractor: NodeExtractor;

    beforeAll(() => {
      extractor = new NodeExtractor('cpp');
    });

    it('should extract class declarations', async () => {
      const source = `
class Calculator {
public:
    Calculator() : value(0) {}
    
private:
    int value;
};
`;
      const parser = await loader.getParser('cpp');
      const tree = parser.parse(source);
      const nodes = extractor.extract(tree.rootNode, source);

      const classes = nodes.filter((n) => n.type === 'class');
      expect(classes.length).toBe(1);
      expect(classes[0]!.name).toBe('Calculator');
      tree.delete();
    });
  });

  describe('custom rules', () => {
    it('should accept custom extraction rules', async () => {
      const customRules = [
        {
          nodeTypes: ['function_declaration'],
          blockType: 'function' as const,
          nameField: 'name',
          minLength: 10,
        },
      ];

      const extractor = new NodeExtractor('typescript', customRules);

      const source = `
function greet(name: string): string {
  return 'Hello, ' + name + '!';
}
`;
      const parser = await loader.getParser('typescript');
      const tree = parser.parse(source);
      const nodes = extractor.extract(tree.rootNode, source);

      // Should still extract functions
      expect(nodes.length).toBeGreaterThan(0);
      tree.delete();
    });
  });

  describe('extracted node properties', () => {
    it('should include content', async () => {
      const source = `
function greet(name: string): string {
  return 'Hello, ' + name + '!';
}
`;
      const parser = await loader.getParser('typescript');
      const tree = parser.parse(source);
      const extractor = new NodeExtractor('typescript');
      const nodes = extractor.extract(tree.rootNode, source);

      expect(nodes[0]!.content).toContain('function greet');
      expect(nodes[0]!.content).toContain('return');
      tree.delete();
    });

    it('should include column information', async () => {
      const source = `function greet() { return 'hello'; }`;
      const parser = await loader.getParser('typescript');
      const tree = parser.parse(source);
      const extractor = new NodeExtractor('typescript');
      const nodes = extractor.extract(tree.rootNode, source);

      expect(nodes[0]!.startColumn).toBe(0);
      expect(nodes[0]!.endColumn).toBeGreaterThan(0);
      tree.delete();
    });
  });
});
