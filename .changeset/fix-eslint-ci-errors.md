---
"@nlci/core": patch
---

Fix ESLint errors blocking CI pipeline

- Fixed type safety issue in hyperplane.ts (explicit bigint[] array initialization)
- Fixed unused parameter in node-extractor.ts (prefixed with underscore)
- Fixed import() type annotation violations in tree-sitter-parser.ts (moved to proper import statement)
- Initialized Changesets for automated release management
