# NLCI — Autonomous Completion Brief

## Project Identity

- **Repo:** `iamthegreatdestroyer/NLCI`
- **Local path:** `S:\NLCI`
- **Language:** TypeScript (monorepo)
- **Castle Layer:** Layer 5 — Application Suite (Code Intelligence)
- **Current completion:** ~72%
- **Mission:** Neural-LSH Code Intelligence — sub-linear O(1) code clone detection using neural embeddings + LSH, delivered as CLI + VS Code extension

## Key File Map

```
NLCI/
├── apps/              # Applications (CLI, VS Code extension)
├── packages/          # Shared packages (core LSH, embeddings)
├── benchmarks/        # Performance benchmarks
├── examples/          # Usage examples
└── scripts/           # Build scripts
```

## Sprint Plan

### Sprint 1 — Build & Baseline (Day 1)

```
@APEX run: npm install && npm run build
If it fails, check packages/core first (LSH engine), then apps/.
Fix all TypeScript errors. Run: npm test
Document pass/fail in BUILD_STATUS.md.
```

### Sprint 2 — CLI Completion (Day 1–2)

```
@APEX run: node apps/cli/dist/index.js scan ./src
If scan doesn't work, identify missing pieces in apps/cli/src/.
The CLI must:
  1. nlci scan <dir> — detect clones, print file:line pairs
  2. nlci report — output JSON or HTML clone report
  3. nlci --threshold 0.85 — configurable similarity threshold
Test: nlci scan ./packages/ should detect any duplicate code.
```

### Sprint 3 — VS Code Extension (Day 2)

```
@APEX run: cd apps/vscode-extension && npm run compile
Fix any errors. Package: vsce package → produces nlci-*.vsix
Install locally: code --install-extension nlci-*.vsix
Open a file with known clone → verify extension highlights it.
If vsce is not installed: npm install -g @vscode/vsce
```

### Sprint 4 — npm Publish Prep + Tag (Day 3)

```
@APEX update package.json version to 1.0.0 in packages/core and apps/cli.
Run: npm run build && npm test (all must pass).
Create .npmrc if needed.
If npm credentials available: npm publish --access public
Otherwise: create PUBLISH_INSTRUCTIONS.md with the exact commands.

git tag v1.0.0 && git push origin v1.0.0
```

## Done Criteria

- [ ] `npm install && npm run build` succeeds
- [ ] `npm test` passes — no failures
- [ ] `nlci scan ./src` returns clone detection results
- [ ] `vsce package` produces installable .vsix
- [ ] `v1.0.0` tag pushed

## Completion Signal

```bash
git tag v1.0.0 && git push origin v1.0.0
```
