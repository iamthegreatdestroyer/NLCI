# NLCI v1.0.0 — Publish Instructions

## Prerequisites

- npm account with publish rights to `@nlci` org scope
- VS Code Marketplace PAT (Personal Access Token) for `vsce publish`

## 1. Publish @nlci/shared

```bash
cd packages/shared
npm publish --access public
```

## 2. Publish @nlci/core

```bash
cd packages/core
npm publish --access public
```

## 3. Publish @nlci/cli

```bash
cd apps/cli
npm publish --access public
```

## 4. Publish VS Code Extension

Requires a PAT from https://dev.azure.com with Marketplace (publish) scope.

```bash
cd apps/vscode-extension
# Set your PAT:
export VSCE_PAT=<your-pat>
node --require ./polyfill-file.cjs \
  node_modules/.pnpm/@vscode+vsce@2.32.0/node_modules/@vscode/vsce/out/main.js \
  publish --no-dependencies
```

Or install vsce globally on Node 20+ and run:

```bash
npm install -g @vscode/vsce
vsce publish --no-dependencies
```

## Notes

- Node 18 requires the `polyfill-file.cjs` shim for `vsce` due to `undici@7` requiring the `File` global (added in Node 20).
- The `.vsix` artifact `apps/vscode-extension/nlci-vscode-1.0.0.vsix` can be installed locally with:
  ```bash
  code --install-extension apps/vscode-extension/nlci-vscode-1.0.0.vsix
  ```
