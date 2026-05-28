# NLCI v1.0.0 — Build Status

## Build

| Package      | Status |
| ------------ | ------ |
| @nlci/shared | PASS   |
| @nlci/core   | PASS   |
| @nlci/cli    | PASS   |
| nlci-vscode  | PASS   |

## Tests

| Suite      | Files  | Tests   | Result   |
| ---------- | ------ | ------- | -------- |
| @nlci/core | 12     | 399     | PASS     |
| @nlci/cli  | 4      | 63      | PASS     |
| **Total**  | **16** | **462** | **PASS** |

## CLI Smoke Test

```
nlci scan packages/ --force
  Files scanned:  56
  Code blocks:    110
  Unique hashes:  110
  Data processed: 1.5 MB
  Duration:       ~540ms

nlci report --format json
  blocksIndexed:  110
  clonePairsFound: 5
  clonesByType: { type-1: 6, type-2: 4, type-3: 0, type-4: 0 }
```

## VS Code Extension

- Compiled: `apps/vscode-extension/dist/extension.js` (273 KB)
- Packaged: `apps/vscode-extension/nlci-vscode-0.1.0.vsix` (66 KB)

## Known Issues

- Node 18: `vsce package` requires `polyfill-file.cjs` shim (undici@7 needs `File` global, added in Node 20).
  Workaround documented in `PUBLISH_INSTRUCTIONS.md`.
