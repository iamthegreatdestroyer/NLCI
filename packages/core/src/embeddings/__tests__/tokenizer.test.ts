/**
 * Tests for CodeTokenizer
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { Token } from '../tokenizer.js';
import { CodeTokenizer, KEYWORDS, OPERATORS } from '../tokenizer.js';

describe('CodeTokenizer', () => {
  let tokenizer: CodeTokenizer;

  beforeEach(() => {
    tokenizer = new CodeTokenizer('typescript');
  });

  describe('constructor', () => {
    it('should create tokenizer with default language', () => {
      const t = new CodeTokenizer();
      expect(t).toBeDefined();
    });

    it('should create tokenizer with specified language', () => {
      const t = new CodeTokenizer('python');
      expect(t).toBeDefined();
    });
  });

  describe('tokenize()', () => {
    it('should tokenize simple function', () => {
      const code = 'function hello() { return 42; }';
      const tokens = tokenizer.tokenize(code);

      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens.some((t) => t.type === 'keyword' && t.value === 'function')).toBe(true);
      expect(tokens.some((t) => t.type === 'keyword' && t.value === 'return')).toBe(true);
      expect(tokens.some((t) => t.type === 'identifier' && t.value === 'hello')).toBe(true);
    });

    it('should tokenize keywords correctly', () => {
      const code = 'const x = async function() { await y; }';
      const tokens = tokenizer.tokenize(code);

      const keywords = tokens.filter((t) => t.type === 'keyword');
      expect(keywords.map((k) => k.value)).toContain('const');
      expect(keywords.map((k) => k.value)).toContain('async');
      expect(keywords.map((k) => k.value)).toContain('function');
      expect(keywords.map((k) => k.value)).toContain('await');
    });

    it('should tokenize operators', () => {
      const code = 'x = a + b * c / d - e';
      const tokens = tokenizer.tokenize(code);

      const operators = tokens.filter((t) => t.type === 'operator');
      expect(operators.map((o) => o.value)).toContain('=');
      expect(operators.map((o) => o.value)).toContain('+');
      expect(operators.map((o) => o.value)).toContain('*');
      expect(operators.map((o) => o.value)).toContain('/');
      expect(operators.map((o) => o.value)).toContain('-');
    });

    it('should handle multi-character operators', () => {
      const code = 'a === b && c !== d || e >= f';
      const tokens = tokenizer.tokenize(code);

      const operators = tokens.filter((t) => t.type === 'operator');
      expect(operators.map((o) => o.value)).toContain('===');
      expect(operators.map((o) => o.value)).toContain('&&');
      expect(operators.map((o) => o.value)).toContain('!==');
      expect(operators.map((o) => o.value)).toContain('||');
      expect(operators.map((o) => o.value)).toContain('>=');
    });

    it('should skip whitespace', () => {
      const code = 'abc    def\n\t\tghi';
      const tokens = tokenizer.tokenize(code);

      expect(tokens.every((t) => t.type !== 'whitespace')).toBe(true);
      // Single-letter identifiers are filtered out (length > 1 requirement)
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle string literals', () => {
      const code = 'const x = "hello world";';
      const tokens = tokenizer.tokenize(code);

      expect(tokens.some((t) => t.type === 'string')).toBe(true);
    });

    it('should handle template literals', () => {
      const code = 'const x = `template string`;';
      const tokens = tokenizer.tokenize(code);

      // Template literals should be detected as strings
      expect(tokens.some((t) => t.type === 'string')).toBe(true);
    });

    it('should handle numbers', () => {
      const code = 'const a = 42; const b = 3.14; const c = 0xff;';
      const tokens = tokenizer.tokenize(code);

      const numbers = tokens.filter((t) => t.type === 'number');
      expect(numbers.length).toBe(3);
    });

    it('should extract words from comments', () => {
      const code = '// This is a helpful comment\nconst x = 1;';
      const tokens = tokenizer.tokenize(code);

      const comments = tokens.filter((t) => t.type === 'comment');
      expect(comments.length).toBeGreaterThan(0);
      expect(comments.some((c) => c.value === 'this')).toBe(true);
      expect(comments.some((c) => c.value === 'helpful')).toBe(true);
      expect(comments.some((c) => c.value === 'comment')).toBe(true);
    });

    it('should split camelCase identifiers', () => {
      const code = 'function getUserById() {}';
      const tokens = tokenizer.tokenize(code);

      const identifiers = tokens.filter((t) => t.type === 'identifier');
      const values = identifiers.map((i) => i.value);
      expect(values).toContain('get');
      expect(values).toContain('user');
      expect(values).toContain('by');
      expect(values).toContain('id');
    });

    it('should split snake_case identifiers', () => {
      const code = 'const get_user_by_id = 1;';
      const tokens = tokenizer.tokenize(code);

      const identifiers = tokens.filter((t) => t.type === 'identifier');
      const values = identifiers.map((i) => i.value);
      expect(values).toContain('get');
      expect(values).toContain('user');
      expect(values).toContain('by');
      expect(values).toContain('id');
    });

    it('should handle empty code', () => {
      const tokens = tokenizer.tokenize('');
      expect(tokens).toEqual([]);
    });

    it('should handle whitespace-only code', () => {
      const tokens = tokenizer.tokenize('   \n\t\n   ');
      expect(tokens).toEqual([]);
    });

    it('should handle punctuation', () => {
      const code = 'obj.method(arg1, arg2);';
      const tokens = tokenizer.tokenize(code);

      const punctuation = tokens.filter((t) => t.type === 'punctuation');
      expect(punctuation.map((p) => p.value)).toContain('(');
      expect(punctuation.map((p) => p.value)).toContain(')');
      expect(punctuation.map((p) => p.value)).toContain(',');
      expect(punctuation.map((p) => p.value)).toContain(';');
    });
  });

  describe('getTokenFrequencies()', () => {
    it('should count token occurrences', () => {
      const code = 'const x = 1; const y = 2; const z = 3;';
      const tokens = tokenizer.tokenize(code);
      const freqs = tokenizer.getTokenFrequencies(tokens);

      expect(freqs.get('keyword:const')).toBe(3);
      expect(freqs.get('operator:=')).toBe(3);
    });

    it('should handle empty token list', () => {
      const freqs = tokenizer.getTokenFrequencies([]);
      expect(freqs.size).toBe(0);
    });
  });

  describe('extractNGrams()', () => {
    it('should extract bigrams', () => {
      const code = 'const x = 1;';
      const tokens = tokenizer.tokenize(code);
      const ngrams = tokenizer.extractNGrams(tokens, 2);

      expect(ngrams.length).toBeGreaterThan(0);
    });

    it('should extract trigrams', () => {
      const code = 'const x = 1;';
      const tokens = tokenizer.tokenize(code);
      const ngrams = tokenizer.extractNGrams(tokens, 3);

      expect(ngrams.length).toBeGreaterThan(0);
    });

    it('should handle empty token list', () => {
      const ngrams = tokenizer.extractNGrams([], 2);
      expect(ngrams).toEqual([]);
    });

    it('should handle list shorter than n', () => {
      const tokens: Token[] = [{ value: 'x', type: 'identifier' }];
      const ngrams = tokenizer.extractNGrams(tokens, 2);
      expect(ngrams).toEqual([]);
    });
  });

  describe('Python tokenization', () => {
    beforeEach(() => {
      tokenizer = new CodeTokenizer('python');
    });

    it('should recognize Python keywords', () => {
      const code = 'def hello(): pass';
      const tokens = tokenizer.tokenize(code);

      const keywords = tokens.filter((t) => t.type === 'keyword');
      expect(keywords.map((k) => k.value)).toContain('def');
      expect(keywords.map((k) => k.value)).toContain('pass');
    });

    it('should handle Python comments', () => {
      const code = '# This is a comment\nx = 1';
      const tokens = tokenizer.tokenize(code);

      expect(tokens.some((t) => t.type === 'comment')).toBe(true);
    });
  });
});

describe('KEYWORDS', () => {
  it('should have TypeScript keywords', () => {
    expect(KEYWORDS['typescript']).toBeDefined();
    expect(KEYWORDS['typescript'].has('function')).toBe(true);
    expect(KEYWORDS['typescript'].has('interface')).toBe(true);
    expect(KEYWORDS['typescript'].has('type')).toBe(true);
  });

  it('should have Python keywords', () => {
    expect(KEYWORDS['python']).toBeDefined();
    expect(KEYWORDS['python'].has('def')).toBe(true);
    expect(KEYWORDS['python'].has('class')).toBe(true);
  });

  it('should have keywords for all major languages', () => {
    const languages = [
      'typescript',
      'javascript',
      'python',
      'java',
      'go',
      'rust',
      'c',
      'cpp',
      'csharp',
    ];
    for (const lang of languages) {
      expect(KEYWORDS[lang]).toBeDefined();
      expect(KEYWORDS[lang].size).toBeGreaterThan(0);
    }
  });
});

describe('OPERATORS', () => {
  it('should contain common operators', () => {
    expect(OPERATORS.has('+')).toBe(true);
    expect(OPERATORS.has('-')).toBe(true);
    expect(OPERATORS.has('*')).toBe(true);
    expect(OPERATORS.has('/')).toBe(true);
    expect(OPERATORS.has('=')).toBe(true);
    expect(OPERATORS.has('==')).toBe(true);
    expect(OPERATORS.has('===')).toBe(true);
    expect(OPERATORS.has('=>')).toBe(true);
  });
});
