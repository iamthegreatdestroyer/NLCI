/**
 * @nlci/core - Code Tokenizer
 *
 * Intelligent code tokenization for embedding generation.
 * Handles identifiers, keywords, operators, and code structure.
 */

import type { SupportedLanguage } from '../types/code-block.js';

/**
 * Token types recognized by the tokenizer.
 */
export type TokenType =
  | 'identifier'
  | 'keyword'
  | 'operator'
  | 'literal'
  | 'punctuation'
  | 'comment'
  | 'string'
  | 'number'
  | 'whitespace';

/**
 * A single token extracted from code.
 */
export interface Token {
  /** The token text */
  value: string;
  /** Token classification */
  type: TokenType;
  /** Original position in source (optional) */
  position?: number;
}

/**
 * Language-specific keyword sets.
 */
const KEYWORDS: Record<string, Set<string>> = {
  typescript: new Set([
    'abstract',
    'as',
    'async',
    'await',
    'break',
    'case',
    'catch',
    'class',
    'const',
    'continue',
    'debugger',
    'declare',
    'default',
    'delete',
    'do',
    'else',
    'enum',
    'export',
    'extends',
    'false',
    'finally',
    'for',
    'from',
    'function',
    'get',
    'if',
    'implements',
    'import',
    'in',
    'instanceof',
    'interface',
    'is',
    'keyof',
    'let',
    'module',
    'namespace',
    'never',
    'new',
    'null',
    'of',
    'package',
    'private',
    'protected',
    'public',
    'readonly',
    'require',
    'return',
    'set',
    'static',
    'super',
    'switch',
    'this',
    'throw',
    'true',
    'try',
    'type',
    'typeof',
    'undefined',
    'var',
    'void',
    'while',
    'with',
    'yield',
  ]),
  javascript: new Set([
    'async',
    'await',
    'break',
    'case',
    'catch',
    'class',
    'const',
    'continue',
    'debugger',
    'default',
    'delete',
    'do',
    'else',
    'export',
    'extends',
    'false',
    'finally',
    'for',
    'from',
    'function',
    'get',
    'if',
    'import',
    'in',
    'instanceof',
    'let',
    'new',
    'null',
    'of',
    'return',
    'set',
    'static',
    'super',
    'switch',
    'this',
    'throw',
    'true',
    'try',
    'typeof',
    'undefined',
    'var',
    'void',
    'while',
    'with',
    'yield',
  ]),
  python: new Set([
    'False',
    'None',
    'True',
    'and',
    'as',
    'assert',
    'async',
    'await',
    'break',
    'class',
    'continue',
    'def',
    'del',
    'elif',
    'else',
    'except',
    'finally',
    'for',
    'from',
    'global',
    'if',
    'import',
    'in',
    'is',
    'lambda',
    'nonlocal',
    'not',
    'or',
    'pass',
    'raise',
    'return',
    'try',
    'while',
    'with',
    'yield',
  ]),
  java: new Set([
    'abstract',
    'assert',
    'boolean',
    'break',
    'byte',
    'case',
    'catch',
    'char',
    'class',
    'const',
    'continue',
    'default',
    'do',
    'double',
    'else',
    'enum',
    'extends',
    'final',
    'finally',
    'float',
    'for',
    'goto',
    'if',
    'implements',
    'import',
    'instanceof',
    'int',
    'interface',
    'long',
    'native',
    'new',
    'package',
    'private',
    'protected',
    'public',
    'return',
    'short',
    'static',
    'strictfp',
    'super',
    'switch',
    'synchronized',
    'this',
    'throw',
    'throws',
    'transient',
    'try',
    'void',
    'volatile',
    'while',
  ]),
  go: new Set([
    'break',
    'case',
    'chan',
    'const',
    'continue',
    'default',
    'defer',
    'else',
    'fallthrough',
    'for',
    'func',
    'go',
    'goto',
    'if',
    'import',
    'interface',
    'map',
    'package',
    'range',
    'return',
    'select',
    'struct',
    'switch',
    'type',
    'var',
  ]),
  rust: new Set([
    'as',
    'async',
    'await',
    'break',
    'const',
    'continue',
    'crate',
    'dyn',
    'else',
    'enum',
    'extern',
    'false',
    'fn',
    'for',
    'if',
    'impl',
    'in',
    'let',
    'loop',
    'match',
    'mod',
    'move',
    'mut',
    'pub',
    'ref',
    'return',
    'self',
    'Self',
    'static',
    'struct',
    'super',
    'trait',
    'true',
    'type',
    'unsafe',
    'use',
    'where',
    'while',
  ]),
  c: new Set([
    'auto',
    'break',
    'case',
    'char',
    'const',
    'continue',
    'default',
    'do',
    'double',
    'else',
    'enum',
    'extern',
    'float',
    'for',
    'goto',
    'if',
    'inline',
    'int',
    'long',
    'register',
    'restrict',
    'return',
    'short',
    'signed',
    'sizeof',
    'static',
    'struct',
    'switch',
    'typedef',
    'union',
    'unsigned',
    'void',
    'volatile',
    'while',
  ]),
  cpp: new Set([
    'alignas',
    'alignof',
    'and',
    'and_eq',
    'asm',
    'auto',
    'bitand',
    'bitor',
    'bool',
    'break',
    'case',
    'catch',
    'char',
    'char16_t',
    'char32_t',
    'class',
    'compl',
    'const',
    'constexpr',
    'const_cast',
    'continue',
    'decltype',
    'default',
    'delete',
    'do',
    'double',
    'dynamic_cast',
    'else',
    'enum',
    'explicit',
    'export',
    'extern',
    'false',
    'float',
    'for',
    'friend',
    'goto',
    'if',
    'inline',
    'int',
    'long',
    'mutable',
    'namespace',
    'new',
    'noexcept',
    'not',
    'not_eq',
    'nullptr',
    'operator',
    'or',
    'or_eq',
    'private',
    'protected',
    'public',
    'register',
    'reinterpret_cast',
    'return',
    'short',
    'signed',
    'sizeof',
    'static',
    'static_assert',
    'static_cast',
    'struct',
    'switch',
    'template',
    'this',
    'thread_local',
    'throw',
    'true',
    'try',
    'typedef',
    'typeid',
    'typename',
    'union',
    'unsigned',
    'using',
    'virtual',
    'void',
    'volatile',
    'wchar_t',
    'while',
    'xor',
    'xor_eq',
  ]),
  csharp: new Set([
    'abstract',
    'as',
    'base',
    'bool',
    'break',
    'byte',
    'case',
    'catch',
    'char',
    'checked',
    'class',
    'const',
    'continue',
    'decimal',
    'default',
    'delegate',
    'do',
    'double',
    'else',
    'enum',
    'event',
    'explicit',
    'extern',
    'false',
    'finally',
    'fixed',
    'float',
    'for',
    'foreach',
    'goto',
    'if',
    'implicit',
    'in',
    'int',
    'interface',
    'internal',
    'is',
    'lock',
    'long',
    'namespace',
    'new',
    'null',
    'object',
    'operator',
    'out',
    'override',
    'params',
    'private',
    'protected',
    'public',
    'readonly',
    'ref',
    'return',
    'sbyte',
    'sealed',
    'short',
    'sizeof',
    'stackalloc',
    'static',
    'string',
    'struct',
    'switch',
    'this',
    'throw',
    'true',
    'try',
    'typeof',
    'uint',
    'ulong',
    'unchecked',
    'unsafe',
    'ushort',
    'using',
    'var',
    'virtual',
    'void',
    'volatile',
    'while',
  ]),
};

/**
 * Operators by language.
 */
const OPERATORS = new Set([
  '+',
  '-',
  '*',
  '/',
  '%',
  '=',
  '==',
  '===',
  '!=',
  '!==',
  '<',
  '>',
  '<=',
  '>=',
  '&&',
  '||',
  '!',
  '&',
  '|',
  '^',
  '~',
  '<<',
  '>>',
  '>>>',
  '++',
  '--',
  '+=',
  '-=',
  '*=',
  '/=',
  '%=',
  '&=',
  '|=',
  '^=',
  '<<=',
  '>>=',
  '>>>=',
  '=>',
  '->',
  '?',
  ':',
  '::',
  '.',
  '..',
  '...',
  '??',
  '?.',
  '?.',
]);

/**
 * Code tokenizer for semantic analysis.
 */
export class CodeTokenizer {
  private readonly language: SupportedLanguage;
  private readonly keywords: Set<string>;

  constructor(language: SupportedLanguage = 'typescript') {
    this.language = language;
    this.keywords = KEYWORDS[language] || KEYWORDS['typescript'];
  }

  /**
   * Tokenize source code into semantic tokens.
   */
  tokenize(code: string): Token[] {
    const tokens: Token[] = [];
    let position = 0;

    while (position < code.length) {
      const remaining = code.slice(position);
      const consumed = 0;

      // Skip whitespace
      const whitespaceMatch = remaining.match(/^[\s\n\r\t]+/);
      if (whitespaceMatch) {
        position += whitespaceMatch[0].length;
        continue;
      }

      // Comments (single-line and multi-line)
      const commentMatch = remaining.match(/^(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*)/);
      if (commentMatch) {
        // Extract meaningful words from comments
        const words = commentMatch[0].match(/[a-zA-Z_][a-zA-Z0-9_]*/g);
        if (words) {
          for (const word of words) {
            if (word.length > 1) {
              tokens.push({ value: word.toLowerCase(), type: 'comment', position });
            }
          }
        }
        position += commentMatch[0].length;
        continue;
      }

      // String literals
      const stringMatch = remaining.match(/^(['"`])(?:(?!\1)[^\\]|\\.)*?\1/);
      if (stringMatch) {
        // Extract significant string content for semantics
        const content = stringMatch[0].slice(1, -1);
        if (content.length > 2 && content.length < 100) {
          tokens.push({ value: 'STRING_LITERAL', type: 'string', position });
        }
        position += stringMatch[0].length;
        continue;
      }

      // Template literals (backtick strings)
      const templateMatch = remaining.match(/^`(?:[^`\\]|\\.)*?`/);
      if (templateMatch) {
        tokens.push({ value: 'TEMPLATE_LITERAL', type: 'string', position });
        position += templateMatch[0].length;
        continue;
      }

      // Numbers
      const numberMatch = remaining.match(
        /^-?(?:0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+|\d+\.?\d*(?:e[+-]?\d+)?)/
      );
      if (numberMatch) {
        tokens.push({ value: 'NUMBER', type: 'number', position });
        position += numberMatch[0].length;
        continue;
      }

      // Identifiers and keywords
      const identifierMatch = remaining.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/);
      if (identifierMatch) {
        const word = identifierMatch[0];
        if (this.keywords.has(word)) {
          tokens.push({ value: word, type: 'keyword', position });
        } else {
          // Split camelCase and snake_case identifiers
          const subTokens = this.splitIdentifier(word);
          for (const subToken of subTokens) {
            if (subToken.length > 1) {
              tokens.push({ value: subToken.toLowerCase(), type: 'identifier', position });
            }
          }
        }
        position += word.length;
        continue;
      }

      // Operators
      let foundOperator = false;
      for (let len = 3; len >= 1; len--) {
        const op = remaining.slice(0, len);
        if (OPERATORS.has(op)) {
          tokens.push({ value: op, type: 'operator', position });
          position += len;
          foundOperator = true;
          break;
        }
      }
      if (foundOperator) continue;

      // Punctuation (brackets, braces, etc.)
      const punctMatch = remaining.match(/^[(){}\[\];,]/);
      if (punctMatch) {
        tokens.push({ value: punctMatch[0], type: 'punctuation', position });
        position += 1;
        continue;
      }

      // Skip unknown characters
      position++;
    }

    return tokens;
  }

  /**
   * Split camelCase and snake_case identifiers into sub-tokens.
   */
  private splitIdentifier(identifier: string): string[] {
    // Handle snake_case
    if (identifier.includes('_')) {
      return identifier.split('_').filter((s) => s.length > 0);
    }

    // Handle camelCase and PascalCase
    const parts: string[] = [];
    let current = '';

    for (let i = 0; i < identifier.length; i++) {
      const char = identifier[i];
      const isUpper = char >= 'A' && char <= 'Z';

      if (isUpper && current.length > 0) {
        // Check for consecutive uppercase (e.g., XMLParser -> XML, Parser)
        if (i + 1 < identifier.length) {
          const next = identifier[i + 1];
          if (next >= 'a' && next <= 'z') {
            parts.push(current);
            current = char;
          } else {
            current += char;
          }
        } else {
          current += char;
        }
      } else {
        current += char;
      }
    }

    if (current.length > 0) {
      parts.push(current);
    }

    return parts;
  }

  /**
   * Get token frequencies for TF computation.
   */
  getTokenFrequencies(tokens: Token[]): Map<string, number> {
    const frequencies = new Map<string, number>();

    for (const token of tokens) {
      const key = `${token.type}:${token.value}`;
      frequencies.set(key, (frequencies.get(key) || 0) + 1);
    }

    return frequencies;
  }

  /**
   * Extract n-grams from tokens for structural patterns.
   */
  extractNGrams(tokens: Token[], n: number = 2): string[] {
    const ngrams: string[] = [];

    for (let i = 0; i <= tokens.length - n; i++) {
      const gram = tokens
        .slice(i, i + n)
        .map((t) => `${t.type[0]}:${t.value}`)
        .join('|');
      ngrams.push(gram);
    }

    return ngrams;
  }
}

/**
 * Export keywords for external use.
 */
export { KEYWORDS, OPERATORS };
