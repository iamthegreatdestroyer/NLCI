/**
 * @nlci/core - AST Node Extractor
 *
 * Extracts meaningful code blocks from tree-sitter AST nodes.
 * Configurable extraction rules per language for functions, classes, methods, etc.
 */

import type { Node } from 'web-tree-sitter';
import type { CodeBlockType, SupportedLanguage } from '../../types/code-block.js';

// Type alias for backward compatibility (web-tree-sitter uses 'Node' not 'SyntaxNode')
type SyntaxNode = Node;

/**
 * Rule for extracting code blocks from AST nodes.
 */
export interface ExtractionRule {
  /** AST node types to match */
  nodeTypes: readonly string[];

  /** Type of code block this produces */
  blockType: CodeBlockType;

  /** Field name containing the identifier (e.g., 'name', 'identifier') */
  nameField?: string;

  /** Alternative: child node type containing the identifier */
  nameNodeType?: string;

  /** Minimum content length to include */
  minLength?: number;

  /** Maximum depth in AST to search */
  maxDepth?: number;

  /** Whether to include nested matches */
  includeNested?: boolean;
}

/**
 * Extracted node information.
 */
export interface ExtractedNode {
  /** Type of code block */
  type: CodeBlockType;

  /** Name of the block (function name, class name, etc.) */
  name: string;

  /** Source code content */
  content: string;

  /** Starting line (1-indexed) */
  startLine: number;

  /** Ending line (1-indexed) */
  endLine: number;

  /** Starting column (0-indexed) */
  startColumn: number;

  /** Ending column (0-indexed) */
  endColumn: number;

  /** Parent node type, if any */
  parentType?: string;
}

/**
 * Language-specific extraction rules.
 */
const LANGUAGE_RULES: ReadonlyMap<SupportedLanguage, readonly ExtractionRule[]> = new Map([
  [
    'typescript',
    [
      {
        nodeTypes: ['function_declaration', 'generator_function_declaration'],
        blockType: 'function',
        nameField: 'name',
        minLength: 20,
      },
      {
        nodeTypes: ['class_declaration'],
        blockType: 'class',
        nameField: 'name',
        minLength: 20,
      },
      {
        nodeTypes: ['method_definition'],
        blockType: 'method',
        nameField: 'name',
        minLength: 20,
      },
      {
        nodeTypes: ['arrow_function'],
        blockType: 'function',
        minLength: 30,
      },
      {
        nodeTypes: ['function_expression', 'generator_function'],
        blockType: 'function',
        minLength: 30,
      },
      {
        nodeTypes: ['interface_declaration'],
        blockType: 'interface',
        nameField: 'name',
        minLength: 20,
      },
      {
        nodeTypes: ['type_alias_declaration'],
        blockType: 'type',
        nameField: 'name',
        minLength: 20,
      },
      {
        nodeTypes: ['enum_declaration'],
        blockType: 'enum',
        nameField: 'name',
        minLength: 20,
      },
      {
        nodeTypes: ['module', 'internal_module'],
        blockType: 'module',
        nameField: 'name',
        minLength: 20,
      },
    ],
  ],
  [
    'javascript',
    [
      {
        nodeTypes: ['function_declaration', 'generator_function_declaration'],
        blockType: 'function',
        nameField: 'name',
        minLength: 20,
      },
      {
        nodeTypes: ['class_declaration'],
        blockType: 'class',
        nameField: 'name',
        minLength: 20,
      },
      {
        nodeTypes: ['method_definition'],
        blockType: 'method',
        nameField: 'name',
        minLength: 20,
      },
      {
        nodeTypes: ['arrow_function'],
        blockType: 'function',
        minLength: 30,
      },
      {
        nodeTypes: ['function_expression', 'generator_function'],
        blockType: 'function',
        minLength: 30,
      },
    ],
  ],
  [
    'python',
    [
      {
        nodeTypes: ['function_definition'],
        blockType: 'function',
        nameField: 'name',
        minLength: 20,
      },
      {
        nodeTypes: ['class_definition'],
        blockType: 'class',
        nameField: 'name',
        minLength: 20,
      },
      {
        nodeTypes: ['decorated_definition'],
        blockType: 'function',
        minLength: 20,
      },
    ],
  ],
  [
    'java',
    [
      {
        nodeTypes: ['method_declaration', 'constructor_declaration'],
        blockType: 'method',
        nameField: 'name',
        minLength: 20,
      },
      {
        nodeTypes: ['class_declaration'],
        blockType: 'class',
        nameField: 'name',
        minLength: 20,
      },
      {
        nodeTypes: ['interface_declaration'],
        blockType: 'interface',
        nameField: 'name',
        minLength: 20,
      },
      {
        nodeTypes: ['enum_declaration'],
        blockType: 'enum',
        nameField: 'name',
        minLength: 20,
      },
    ],
  ],
  [
    'go',
    [
      {
        nodeTypes: ['function_declaration'],
        blockType: 'function',
        nameField: 'name',
        minLength: 20,
      },
      {
        nodeTypes: ['method_declaration'],
        blockType: 'method',
        nameField: 'name',
        minLength: 20,
      },
      {
        nodeTypes: ['type_declaration'],
        blockType: 'type',
        nameField: 'name',
        minLength: 20,
      },
      {
        nodeTypes: ['struct_type'],
        blockType: 'struct',
        minLength: 20,
      },
      {
        nodeTypes: ['interface_type'],
        blockType: 'interface',
        minLength: 20,
      },
    ],
  ],
  [
    'rust',
    [
      {
        nodeTypes: ['function_item'],
        blockType: 'function',
        nameField: 'name',
        minLength: 20,
      },
      {
        nodeTypes: ['struct_item'],
        blockType: 'struct',
        nameField: 'name',
        minLength: 20,
      },
      {
        nodeTypes: ['enum_item'],
        blockType: 'enum',
        nameField: 'name',
        minLength: 20,
      },
      {
        nodeTypes: ['trait_item'],
        blockType: 'trait',
        nameField: 'name',
        minLength: 20,
      },
      {
        nodeTypes: ['impl_item'],
        blockType: 'impl',
        minLength: 20,
      },
      {
        nodeTypes: ['mod_item'],
        blockType: 'module',
        nameField: 'name',
        minLength: 20,
      },
    ],
  ],
  [
    'c',
    [
      {
        nodeTypes: ['function_definition'],
        blockType: 'function',
        nameNodeType: 'function_declarator',
        minLength: 20,
      },
      {
        nodeTypes: ['struct_specifier'],
        blockType: 'struct',
        nameField: 'name',
        minLength: 20,
      },
      {
        nodeTypes: ['enum_specifier'],
        blockType: 'enum',
        nameField: 'name',
        minLength: 20,
      },
    ],
  ],
  [
    'cpp',
    [
      {
        nodeTypes: ['function_definition'],
        blockType: 'function',
        nameNodeType: 'function_declarator',
        minLength: 20,
      },
      {
        nodeTypes: ['class_specifier'],
        blockType: 'class',
        nameField: 'name',
        minLength: 20,
      },
      {
        nodeTypes: ['struct_specifier'],
        blockType: 'struct',
        nameField: 'name',
        minLength: 20,
      },
      {
        nodeTypes: ['enum_specifier'],
        blockType: 'enum',
        nameField: 'name',
        minLength: 20,
      },
      {
        nodeTypes: ['namespace_definition'],
        blockType: 'namespace',
        nameField: 'name',
        minLength: 20,
      },
    ],
  ],
  [
    'csharp',
    [
      {
        nodeTypes: ['method_declaration', 'constructor_declaration'],
        blockType: 'method',
        nameField: 'name',
        minLength: 20,
      },
      {
        nodeTypes: ['class_declaration'],
        blockType: 'class',
        nameField: 'name',
        minLength: 20,
      },
      {
        nodeTypes: ['interface_declaration'],
        blockType: 'interface',
        nameField: 'name',
        minLength: 20,
      },
      {
        nodeTypes: ['struct_declaration'],
        blockType: 'struct',
        nameField: 'name',
        minLength: 20,
      },
      {
        nodeTypes: ['enum_declaration'],
        blockType: 'enum',
        nameField: 'name',
        minLength: 20,
      },
      {
        nodeTypes: ['namespace_declaration'],
        blockType: 'namespace',
        nameField: 'name',
        minLength: 20,
      },
    ],
  ],
]);

/**
 * Extracts code blocks from tree-sitter AST nodes.
 *
 * Uses configurable rules per language to identify and extract
 * meaningful code structures like functions, classes, and methods.
 *
 * @example
 * ```typescript
 * const extractor = new NodeExtractor('typescript');
 * const tree = parser.parse(sourceCode);
 * const blocks = extractor.extract(tree.rootNode, sourceCode);
 * ```
 */
export class NodeExtractor {
  private readonly rules: readonly ExtractionRule[];
  private readonly nodeTypeSet: Set<string>;

  /**
   * Creates a new node extractor for the specified language.
   *
   * @param language - Target language
   * @param customRules - Optional custom extraction rules
   */
  constructor(
    private readonly language: SupportedLanguage,
    customRules?: readonly ExtractionRule[]
  ) {
    this.rules = customRules ?? LANGUAGE_RULES.get(language) ?? this.getDefaultRules();
    this.nodeTypeSet = new Set(this.rules.flatMap((r) => [...r.nodeTypes]));
  }

  /**
   * Gets default extraction rules for unsupported languages.
   */
  private getDefaultRules(): readonly ExtractionRule[] {
    return [
      {
        nodeTypes: ['function_definition', 'function_declaration', 'function_item'],
        blockType: 'function',
        nameField: 'name',
        minLength: 20,
      },
      {
        nodeTypes: ['class_definition', 'class_declaration', 'class_specifier'],
        blockType: 'class',
        nameField: 'name',
        minLength: 20,
      },
      {
        nodeTypes: ['method_definition', 'method_declaration'],
        blockType: 'method',
        nameField: 'name',
        minLength: 20,
      },
    ];
  }

  /**
   * Extracts code blocks from an AST.
   *
   * @param rootNode - Root node of the parsed AST
   * @param source - Original source code
   * @returns Extracted code blocks
   */
  extract(rootNode: SyntaxNode, source: string): ExtractedNode[] {
    const results: ExtractedNode[] = [];
    const visited = new Set<number>();

    this.traverseAndExtract(rootNode, source, results, visited, 0);

    return results;
  }

  /**
   * Traverses the AST and extracts matching nodes.
   */
  private traverseAndExtract(
    node: SyntaxNode,
    source: string,
    results: ExtractedNode[],
    visited: Set<number>,
    depth: number
  ): void {
    // Avoid processing the same node twice
    const nodeId = node.id;
    if (visited.has(nodeId)) return;

    // Check if this node type matches any rule
    if (this.nodeTypeSet.has(node.type)) {
      const extracted = this.tryExtract(node, source);
      if (extracted) {
        visited.add(nodeId);
        results.push(extracted);

        // Mark all descendant nodes as visited to avoid duplicates
        this.markDescendantsVisited(node, visited);
        return; // Don't traverse into extracted blocks
      }
    }

    // Traverse children
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) {
        this.traverseAndExtract(child, source, results, visited, depth + 1);
      }
    }
  }

  /**
   * Marks all descendants of a node as visited.
   */
  private markDescendantsVisited(node: SyntaxNode, visited: Set<number>): void {
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) {
        visited.add(child.id);
        this.markDescendantsVisited(child, visited);
      }
    }
  }

  /**
   * Attempts to extract a code block from a node.
   */
  private tryExtract(node: SyntaxNode, source: string): ExtractedNode | null {
    const rule = this.rules.find((r) => r.nodeTypes.includes(node.type));
    if (!rule) return null;

    const content = node.text;
    const minLength = rule.minLength ?? 20;

    // Check minimum length
    if (content.trim().length < minLength) {
      return null;
    }

    // Extract name
    const name = this.extractName(node, rule);

    return {
      type: rule.blockType,
      name: name || `anonymous_${node.startPosition.row + 1}`,
      content,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      startColumn: node.startPosition.column,
      endColumn: node.endPosition.column,
      parentType: node.parent?.type,
    };
  }

  /**
   * Extracts the name from a node using the rule configuration.
   */
  private extractName(node: SyntaxNode, rule: ExtractionRule): string | null {
    // Try named field first
    if (rule.nameField) {
      const nameNode = node.childForFieldName(rule.nameField);
      if (nameNode) {
        return nameNode.text;
      }
    }

    // Try child node type
    if (rule.nameNodeType) {
      const nameNode = this.findChildByType(node, rule.nameNodeType);
      if (nameNode) {
        // For function_declarator, get the identifier inside it
        const identifier =
          nameNode.childForFieldName('declarator') ?? this.findChildByType(nameNode, 'identifier');
        if (identifier) {
          return identifier.text;
        }
        return nameNode.text;
      }
    }

    // Try common identifier patterns
    const identifier =
      node.childForFieldName('name') ??
      node.childForFieldName('identifier') ??
      this.findChildByType(node, 'identifier') ??
      this.findChildByType(node, 'property_identifier');

    return identifier?.text ?? null;
  }

  /**
   * Finds a child node by type (non-recursive).
   */
  private findChildByType(node: SyntaxNode, type: string): SyntaxNode | null {
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child?.type === type) {
        return child;
      }
    }
    return null;
  }

  /**
   * Gets the extraction rules for this language.
   */
  getRules(): readonly ExtractionRule[] {
    return this.rules;
  }
}
