# VSCODE-ENV Test Suite

## Agent Under Test

| Attribute        | Value              |
| ---------------- | ------------------ |
| **Agent**        | @VSCODE-ENV        |
| **Tier**         | 0 (Infrastructure) |
| **ID**           | 00                 |
| **Version**      | 1.0.0              |
| **Last Updated** | 2025-02-03         |

---

## Test Suite Overview

This test suite validates the @VSCODE-ENV agent's ability to analyze projects, generate optimized configurations, and manage VS Code environments. Tests span four difficulty tiers designed to evaluate capabilities from basic detection to extreme edge cases.

### Test Distribution

| Tier      | Category     | Test Count | Focus Area                                                     |
| --------- | ------------ | ---------- | -------------------------------------------------------------- |
| 1         | Foundation   | 25         | Basic detection, file generation, format validation            |
| 2         | Intermediate | 30         | Multi-language, monorepo, conflict resolution                  |
| 3         | Advanced     | 25         | Complex scenarios, performance optimization, agent integration |
| 4         | Extreme      | 20         | Edge cases, recovery, massive scale, adversarial inputs        |
| **Total** |              | **100**    |                                                                |

---

## TIER 1: FOUNDATION TESTS (25 tests)

### Category 1.1: Stack Detection (10 tests)

#### FND-001: Detect Node.js/TypeScript Project

```yaml
test_id: FND-001
name: 'Detect Node.js/TypeScript Project'
difficulty: foundation
category: stack_detection
input:
  project_files:
    - package.json (contains typescript dependency)
    - tsconfig.json
    - src/index.ts
expected:
  detected_stack: ['nodejs', 'typescript']
  recommended_extensions:
    - dbaeumer.vscode-eslint
    - esbenp.prettier-vscode
  settings:
    - typescript.tsdk: 'node_modules/typescript/lib'
validation:
  - Stack correctly identified
  - TypeScript-specific settings generated
  - Appropriate extensions recommended
```

#### FND-002: Detect Python Project

```yaml
test_id: FND-002
name: 'Detect Python Project'
difficulty: foundation
category: stack_detection
input:
  project_files:
    - requirements.txt
    - src/main.py
    - tests/test_main.py
expected:
  detected_stack: ['python']
  recommended_extensions:
    - ms-python.python
    - ms-python.vscode-pylance
  settings:
    - '[python].editor.defaultFormatter': 'ms-python.black-formatter'
validation:
  - Python detected from requirements.txt
  - Python-specific formatter configured
```

#### FND-003: Detect Rust Project

```yaml
test_id: FND-003
name: 'Detect Rust Project'
difficulty: foundation
category: stack_detection
input:
  project_files:
    - Cargo.toml
    - src/main.rs
    - src/lib.rs
expected:
  detected_stack: ['rust']
  recommended_extensions:
    - rust-lang.rust-analyzer
  settings:
    - 'rust-analyzer.checkOnSave.command': 'clippy'
validation:
  - Rust detected from Cargo.toml
  - rust-analyzer configured
```

#### FND-004: Detect Go Project

```yaml
test_id: FND-004
name: 'Detect Go Project'
difficulty: foundation
category: stack_detection
input:
  project_files:
    - go.mod
    - main.go
    - internal/handler.go
expected:
  detected_stack: ['go']
  recommended_extensions:
    - golang.go
validation:
  - Go detected from go.mod
```

#### FND-005: Detect Java Maven Project

```yaml
test_id: FND-005
name: 'Detect Java Maven Project'
difficulty: foundation
category: stack_detection
input:
  project_files:
    - pom.xml
    - src/main/java/App.java
expected:
  detected_stack: ['java', 'maven']
validation:
  - Java detected
  - Maven build system identified
```

#### FND-006: Detect .NET Project

```yaml
test_id: FND-006
name: 'Detect .NET Project'
difficulty: foundation
category: stack_detection
input:
  project_files:
    - MyApp.csproj
    - Program.cs
expected:
  detected_stack: ['dotnet', 'csharp']
validation:
  - .NET detected from .csproj
```

#### FND-007: Detect React Project

```yaml
test_id: FND-007
name: 'Detect React Project'
difficulty: foundation
category: stack_detection
input:
  project_files:
    - package.json (contains react dependency)
    - src/App.tsx
    - src/index.tsx
expected:
  detected_stack: ['nodejs', 'typescript', 'react']
  settings:
    - 'emmet.includeLanguages.typescriptreact': 'html'
validation:
  - React framework detected
  - TSX file associations correct
```

#### FND-008: Detect Vue Project

```yaml
test_id: FND-008
name: 'Detect Vue Project'
difficulty: foundation
category: stack_detection
input:
  project_files:
    - package.json (contains vue dependency)
    - src/App.vue
    - vite.config.ts
expected:
  detected_stack: ['nodejs', 'typescript', 'vue']
  recommended_extensions:
    - Vue.volar
validation:
  - Vue framework detected
```

#### FND-009: Detect Docker Project

```yaml
test_id: FND-009
name: 'Detect Docker Project'
difficulty: foundation
category: stack_detection
input:
  project_files:
    - Dockerfile
    - docker-compose.yml
expected:
  detected_stack: ['docker']
  recommended_extensions:
    - ms-azuretools.vscode-docker
validation:
  - Docker detected from Dockerfile
```

#### FND-010: Detect Empty/New Project

```yaml
test_id: FND-010
name: 'Detect Empty/New Project'
difficulty: foundation
category: stack_detection
input:
  project_files:
    - README.md
expected:
  detected_stack: []
  behavior: 'Prompt user for project type'
validation:
  - Gracefully handles empty project
  - Offers to scaffold configuration
```

### Category 1.2: File Generation (8 tests)

#### FND-011: Generate Valid settings.json

```yaml
test_id: FND-011
name: 'Generate Valid settings.json'
difficulty: foundation
category: file_generation
input:
  detected_stack: ['typescript']
expected:
  file: '.vscode/settings.json'
  valid_json: true
  required_keys:
    - editor.formatOnSave
    - editor.defaultFormatter
validation:
  - JSON is syntactically valid
  - Required keys present
  - No duplicate keys
```

#### FND-012: Generate Valid extensions.json

```yaml
test_id: FND-012
name: 'Generate Valid extensions.json'
difficulty: foundation
category: file_generation
input:
  detected_stack: ['typescript']
expected:
  file: '.vscode/extensions.json'
  valid_json: true
  structure:
    recommendations: array
    unwantedRecommendations: array
validation:
  - JSON valid
  - Correct structure
  - Extension IDs in correct format (publisher.extension)
```

#### FND-013: Generate Valid tasks.json

```yaml
test_id: FND-013
name: 'Generate Valid tasks.json'
difficulty: foundation
category: file_generation
input:
  detected_stack: ['typescript']
  package_scripts: ['build', 'test', 'lint']
expected:
  file: '.vscode/tasks.json'
  valid_json: true
  tasks_count: '>= 3'
validation:
  - JSON valid
  - Version 2.0.0
  - Tasks array exists
  - Each task has label, type, command
```

#### FND-014: Generate Valid launch.json

```yaml
test_id: FND-014
name: 'Generate Valid launch.json'
difficulty: foundation
category: file_generation
input:
  detected_stack: ['typescript']
expected:
  file: '.vscode/launch.json'
  valid_json: true
  configurations_count: '>= 1'
validation:
  - JSON valid
  - Version 0.2.0
  - Configurations array exists
  - Each config has name, type, request
```

#### FND-015: Create .vscode Directory

```yaml
test_id: FND-015
name: 'Create .vscode Directory'
difficulty: foundation
category: file_generation
input:
  existing_vscode_dir: false
expected:
  directory_created: true
  path: '.vscode'
validation:
  - Directory created
  - Correct permissions
```

#### FND-016: Preserve Existing settings.json

```yaml
test_id: FND-016
name: 'Preserve Existing settings.json'
difficulty: foundation
category: file_generation
input:
  existing_settings:
    'custom.setting': true
expected:
  merged: true
  preserved_keys:
    - 'custom.setting'
validation:
  - Existing settings preserved
  - New settings added
  - No data loss
```

#### FND-017: Handle Invalid Existing JSON

```yaml
test_id: FND-017
name: 'Handle Invalid Existing JSON'
difficulty: foundation
category: file_generation
input:
  existing_settings: '{ invalid json'
expected:
  behavior: 'Create backup, generate new file'
  backup_created: true
validation:
  - Invalid JSON detected
  - Backup created
  - New valid JSON generated
```

#### FND-018: Generate with Comments (JSONC)

```yaml
test_id: FND-018
name: 'Generate with Comments (JSONC)'
difficulty: foundation
category: file_generation
input:
  detected_stack: ['typescript']
expected:
  file_format: 'jsonc'
  has_comments: true
validation:
  - Comments present
  - Still valid JSONC
  - VS Code can parse
```

### Category 1.3: Extension Management (7 tests)

#### FND-019: Recommend Essential Extensions

```yaml
test_id: FND-019
name: 'Recommend Essential Extensions'
difficulty: foundation
category: extension_management
input:
  detected_stack: ['any']
expected:
  always_included:
    - github.copilot
    - github.copilot-chat
    - eamodio.gitlens
validation:
  - Universal extensions always recommended
```

#### FND-020: Validate Extension IDs

```yaml
test_id: FND-020
name: 'Validate Extension IDs'
difficulty: foundation
category: extension_management
input:
  recommended_extensions: [list]
expected:
  format: 'publisher.extension-name'
  all_valid: true
validation:
  - All IDs follow correct format
  - No typos in common extension IDs
```

#### FND-021: Avoid Deprecated Extensions

```yaml
test_id: FND-021
name: 'Avoid Deprecated Extensions'
difficulty: foundation
category: extension_management
input:
  deprecated_list: ['ms-vscode.vscode-typescript-tslint-plugin']
expected:
  not_recommended: deprecated_list
validation:
  - Known deprecated extensions excluded
```

#### FND-022: Include in unwantedRecommendations

```yaml
test_id: FND-022
name: 'Include in unwantedRecommendations'
difficulty: foundation
category: extension_management
input:
  conflicting_extensions: ['hookyqr.beautify']
expected:
  unwantedRecommendations_contains: conflicting_extensions
validation:
  - Conflicting extensions in unwanted list
```

#### FND-023: Stack-Specific Extensions

```yaml
test_id: FND-023
name: 'Stack-Specific Extensions'
difficulty: foundation
category: extension_management
input:
  detected_stack: ['python']
expected:
  recommended:
    - ms-python.python
    - ms-python.vscode-pylance
validation:
  - Python extensions only for Python projects
```

#### FND-024: Limit Extension Count

```yaml
test_id: FND-024
name: 'Limit Extension Count'
difficulty: foundation
category: extension_management
input:
  detected_stack: ['typescript', 'react', 'docker']
expected:
  max_recommendations: 25
validation:
  - Not overwhelming user with extensions
  - Most impactful extensions prioritized
```

#### FND-025: No Duplicate Extensions

```yaml
test_id: FND-025
name: 'No Duplicate Extensions'
difficulty: foundation
category: extension_management
input: any
expected:
  unique_recommendations: true
validation:
  - No duplicate extension IDs
```

---

## TIER 2: INTERMEDIATE TESTS (30 tests)

### Category 2.1: Multi-Language Projects (10 tests)

#### INT-001: TypeScript + Python Polyglot

```yaml
test_id: INT-001
name: 'TypeScript + Python Polyglot'
difficulty: intermediate
category: multi_language
input:
  project_files:
    - package.json
    - requirements.txt
    - frontend/src/App.tsx
    - backend/main.py
expected:
  detected_stack: ['typescript', 'python']
  language_specific_settings:
    '[typescript]': { formatter: 'prettier' }
    '[python]': { formatter: 'black' }
validation:
  - Both languages detected
  - Separate formatters configured
  - No conflicts
```

#### INT-002: Full-Stack JavaScript + Go

```yaml
test_id: INT-002
name: 'Full-Stack JavaScript + Go'
difficulty: intermediate
category: multi_language
input:
  project_files:
    - frontend/package.json
    - backend/go.mod
expected:
  detected_stack: ['javascript', 'go']
validation:
  - Both stacks detected
  - Appropriate extensions for each
```

#### INT-003: Rust + TypeScript WASM Project

```yaml
test_id: INT-003
name: 'Rust + TypeScript WASM Project'
difficulty: intermediate
category: multi_language
input:
  project_files:
    - Cargo.toml
    - package.json
    - wasm-bindgen config
expected:
  detected_stack: ['rust', 'typescript', 'wasm']
  recommended_extensions:
    - rust-lang.rust-analyzer
    - dbaeumer.vscode-eslint
validation:
  - WASM workflow detected
  - Both language tools configured
```

#### INT-004: Java + Kotlin Mixed Project

```yaml
test_id: INT-004
name: 'Java + Kotlin Mixed Project'
difficulty: intermediate
category: multi_language
input:
  project_files:
    - build.gradle.kts
    - src/main/java/App.java
    - src/main/kotlin/Utils.kt
expected:
  detected_stack: ['java', 'kotlin', 'gradle']
validation:
  - Both JVM languages detected
  - Gradle build system identified
```

#### INT-005: C++ + Python Scientific Computing

```yaml
test_id: INT-005
name: 'C++ + Python Scientific Computing'
difficulty: intermediate
category: multi_language
input:
  project_files:
    - CMakeLists.txt
    - src/core.cpp
    - python/bindings.py
    - setup.py
expected:
  detected_stack: ['cpp', 'python', 'cmake']
validation:
  - Native extension pattern detected
```

#### INT-006: .NET + TypeScript Blazor WASM

```yaml
test_id: INT-006
name: '.NET + TypeScript Blazor WASM'
difficulty: intermediate
category: multi_language
input:
  project_files:
    - MyApp.csproj (Blazor)
    - wwwroot/js/interop.ts
expected:
  detected_stack: ['dotnet', 'blazor', 'typescript']
validation:
  - Blazor WASM detected
  - TypeScript interop configured
```

#### INT-007: Ruby + JavaScript Rails Project

```yaml
test_id: INT-007
name: 'Ruby + JavaScript Rails Project'
difficulty: intermediate
category: multi_language
input:
  project_files:
    - Gemfile
    - config/routes.rb
    - app/javascript/packs/application.js
expected:
  detected_stack: ['ruby', 'rails', 'javascript']
validation:
  - Rails framework detected
  - Asset pipeline configured
```

#### INT-008: PHP + Vue Laravel Project

```yaml
test_id: INT-008
name: 'PHP + Vue Laravel Project'
difficulty: intermediate
category: multi_language
input:
  project_files:
    - composer.json
    - artisan
    - resources/js/app.vue
expected:
  detected_stack: ['php', 'laravel', 'vue']
validation:
  - Laravel detected
  - Vue frontend configured
```

#### INT-009: Swift + Objective-C iOS Project

```yaml
test_id: INT-009
name: 'Swift + Objective-C iOS Project'
difficulty: intermediate
category: multi_language
input:
  project_files:
    - MyApp.xcodeproj
    - Sources/App.swift
    - Legacy/Bridge.m
expected:
  detected_stack: ['swift', 'objectivec', 'ios']
validation:
  - Mixed iOS project detected
```

#### INT-010: Elixir + JavaScript Phoenix Project

```yaml
test_id: INT-010
name: 'Elixir + JavaScript Phoenix Project'
difficulty: intermediate
category: multi_language
input:
  project_files:
    - mix.exs
    - lib/my_app_web/router.ex
    - assets/js/app.js
expected:
  detected_stack: ['elixir', 'phoenix', 'javascript']
validation:
  - Phoenix framework detected
  - Asset configuration included
```

### Category 2.2: Monorepo Configurations (10 tests)

#### INT-011: Turborepo + pnpm Monorepo

```yaml
test_id: INT-011
name: 'Turborepo + pnpm Monorepo'
difficulty: intermediate
category: monorepo
input:
  project_files:
    - turbo.json
    - pnpm-workspace.yaml
    - apps/web/package.json
    - packages/ui/package.json
expected:
  eslint_workingDirectories:
    - { pattern: 'apps/*' }
    - { pattern: 'packages/*' }
  search_exclude:
    - '**/.turbo'
validation:
  - Turborepo detected
  - pnpm workspace configured
  - ESLint working directories set
```

#### INT-012: Nx Monorepo

```yaml
test_id: INT-012
name: 'Nx Monorepo'
difficulty: intermediate
category: monorepo
input:
  project_files:
    - nx.json
    - workspace.json
    - apps/frontend/project.json
expected:
  recommended_extensions:
    - nrwl.angular-console
validation:
  - Nx detected
  - Nx Console extension recommended
```

#### INT-013: Lerna Monorepo

```yaml
test_id: INT-013
name: 'Lerna Monorepo'
difficulty: intermediate
category: monorepo
input:
  project_files:
    - lerna.json
    - packages/core/package.json
expected:
  eslint_workingDirectories: 'packages/*'
validation:
  - Lerna detected
  - Package structure recognized
```

#### INT-014: Yarn Workspaces

```yaml
test_id: INT-014
name: 'Yarn Workspaces'
difficulty: intermediate
category: monorepo
input:
  project_files:
    - package.json (workspaces field)
    - yarn.lock
expected:
  typescript_tsdk: 'node_modules/typescript/lib'
validation:
  - Yarn workspaces detected
```

#### INT-015: Cargo Workspace (Rust)

```yaml
test_id: INT-015
name: 'Cargo Workspace (Rust)'
difficulty: intermediate
category: monorepo
input:
  project_files:
    - Cargo.toml (workspace members)
    - crates/core/Cargo.toml
expected:
  rust_analyzer_linkedProjects: workspace_members
validation:
  - Rust workspace detected
  - All crates configured
```

#### INT-016: Go Modules Multi-Module

```yaml
test_id: INT-016
name: 'Go Modules Multi-Module'
difficulty: intermediate
category: monorepo
input:
  project_files:
    - go.work
    - services/api/go.mod
    - libs/common/go.mod
expected:
  go_workspace: true
validation:
  - Go workspace detected
```

#### INT-017: Bazel Monorepo

```yaml
test_id: INT-017
name: 'Bazel Monorepo'
difficulty: intermediate
category: monorepo
input:
  project_files:
    - WORKSPACE
    - BUILD.bazel
    - src/lib/BUILD.bazel
expected:
  recommended_extensions:
    - BazelBuild.vscode-bazel
validation:
  - Bazel detected
```

#### INT-018: Multi-Root Workspace Generation

```yaml
test_id: INT-018
name: 'Multi-Root Workspace Generation'
difficulty: intermediate
category: monorepo
input:
  project_structure:
    - frontend/ (React)
    - backend/ (Python)
    - shared/ (TypeScript)
expected:
  generate_workspace_file: true
  workspace_folders: 3
validation:
  - .code-workspace file generated
  - All roots included
  - Folder-specific settings
```

#### INT-019: Nested Package Detection

```yaml
test_id: INT-019
name: 'Nested Package Detection'
difficulty: intermediate
category: monorepo
input:
  project_files:
    - packages/ui/package.json
    - packages/ui/components/package.json (nested)
expected:
  all_packages_detected: true
validation:
  - Nested packages found
  - No duplicate configuration
```

#### INT-020: Mixed Package Managers

```yaml
test_id: INT-020
name: 'Mixed Package Managers'
difficulty: intermediate
category: monorepo
input:
  project_files:
    - pnpm-lock.yaml (root)
    - legacy/yarn.lock (subdirectory)
expected:
  warning: 'Mixed package managers detected'
  primary_manager: 'pnpm'
validation:
  - Conflict detected
  - User warned
  - Primary manager identified
```

### Category 2.3: Conflict Resolution (10 tests)

#### INT-021: Prettier vs ESLint Formatting

```yaml
test_id: INT-021
name: 'Prettier vs ESLint Formatting'
difficulty: intermediate
category: conflict_resolution
input:
  eslint_config: { extends: ['prettier'] }
  prettier_config: { semi: true }
expected:
  editor_defaultFormatter: 'esbenp.prettier-vscode'
  eslint_fix_on_save: true
  no_format_conflict: true
validation:
  - Prettier as primary formatter
  - ESLint for linting only
  - No double-formatting
```

#### INT-022: Multiple TypeScript Versions

```yaml
test_id: INT-022
name: 'Multiple TypeScript Versions'
difficulty: intermediate
category: conflict_resolution
input:
  root_typescript: '5.3.0'
  package_typescript: '4.9.0'
expected:
  typescript_tsdk: 'node_modules/typescript/lib'
  use_workspace_version: true
validation:
  - Workspace TypeScript used
  - Prompt user to use workspace version
```

#### INT-023: Overlapping Extensions

```yaml
test_id: INT-023
name: 'Overlapping Extensions'
difficulty: intermediate
category: conflict_resolution
input:
  candidate_extensions:
    - 'esbenp.prettier-vscode'
    - 'HookyQR.beautify'
expected:
  recommended: 'esbenp.prettier-vscode'
  unwanted: 'HookyQR.beautify'
validation:
  - Better extension chosen
  - Overlapping extension in unwanted
```

#### INT-024: Keybinding Conflicts

```yaml
test_id: INT-024
name: 'Keybinding Conflicts'
difficulty: intermediate
category: conflict_resolution
input:
  extensions_with_keybindings:
    - ext1: 'Ctrl+Shift+P'
    - ext2: 'Ctrl+Shift+P'
expected:
  warning: 'Keybinding conflict detected'
validation:
  - Conflict identified
  - User notified
```

#### INT-025: Language Server Conflicts

```yaml
test_id: INT-025
name: 'Language Server Conflicts'
difficulty: intermediate
category: conflict_resolution
input:
  typescript_extensions:
    - 'vscode.typescript-language-features'
    - 'denoland.vscode-deno'
expected:
  resolution: 'Disable Deno for non-Deno projects'
validation:
  - Only one TS language server active
```

#### INT-026: Formatter Per File Type

```yaml
test_id: INT-026
name: 'Formatter Per File Type'
difficulty: intermediate
category: conflict_resolution
input:
  formatters:
    typescript: 'prettier'
    python: 'black'
    rust: 'rust-analyzer'
expected:
  language_specific_formatters: true
  no_global_override: true
validation:
  - Each language has correct formatter
  - No interference between languages
```

#### INT-027: ESLint vs TSLint Migration

```yaml
test_id: INT-027
name: 'ESLint vs TSLint Migration'
difficulty: intermediate
category: conflict_resolution
input:
  project_files:
    - tslint.json (deprecated)
    - .eslintrc.js
expected:
  warning: 'TSLint is deprecated'
  recommendation: 'Migrate to ESLint'
validation:
  - Deprecated tool detected
  - Migration suggested
```

#### INT-028: Jest vs Vitest Configuration

```yaml
test_id: INT-028
name: 'Jest vs Vitest Configuration'
difficulty: intermediate
category: conflict_resolution
input:
  project_files:
    - jest.config.js
    - vitest.config.ts
expected:
  warning: 'Multiple test runners detected'
  clarification_needed: true
validation:
  - Both test runners detected
  - Ask user for preference
```

#### INT-029: Docker vs Dev Container

```yaml
test_id: INT-029
name: 'Docker vs Dev Container'
difficulty: intermediate
category: conflict_resolution
input:
  project_files:
    - Dockerfile
    - .devcontainer/devcontainer.json
expected:
  devcontainer_priority: true
validation:
  - Dev container takes precedence for VS Code
```

#### INT-030: Git Hooks Conflict

```yaml
test_id: INT-030
name: 'Git Hooks Conflict'
difficulty: intermediate
category: conflict_resolution
input:
  project_files:
    - .husky/pre-commit
    - .git/hooks/pre-commit
expected:
  warning: 'Multiple hook systems'
validation:
  - Conflict detected
  - Husky preference indicated
```

---

## TIER 3: ADVANCED TESTS (25 tests)

### Category 3.1: Performance Optimization (10 tests)

#### ADV-001: Large Codebase Optimization

```yaml
test_id: ADV-001
name: 'Large Codebase Optimization'
difficulty: advanced
category: performance
input:
  file_count: 50000
  total_size_mb: 2000
expected:
  files_exclude: extensive_list
  search_exclude: extensive_list
  files_watcherExclude: extensive_list
  files_maxMemoryForLargeFilesMB: 8192
validation:
  - Aggressive exclusions set
  - Memory increased
  - Watcher optimized
```

#### ADV-002: Node Modules Exclusion

```yaml
test_id: ADV-002
name: 'Node Modules Exclusion'
difficulty: advanced
category: performance
input:
  node_modules_size_gb: 5
expected:
  files_exclude: '**/node_modules'
  search_exclude: '**/node_modules'
  files_watcherExclude: '**/node_modules/**'
validation:
  - node_modules excluded from all operations
```

#### ADV-003: Turbo Cache Exclusion

```yaml
test_id: ADV-003
name: 'Turbo Cache Exclusion'
difficulty: advanced
category: performance
input:
  turbo_cache_present: true
expected:
  files_exclude: '**/.turbo'
  search_exclude: '**/.turbo'
validation:
  - .turbo excluded
```

#### ADV-004: Lock File Exclusion from Search

```yaml
test_id: ADV-004
name: 'Lock File Exclusion from Search'
difficulty: advanced
category: performance
input:
  lock_files:
    - pnpm-lock.yaml
    - package-lock.json
    - yarn.lock
expected:
  search_exclude_all_lock_files: true
validation:
  - All lock files excluded from search
```

#### ADV-005: Binary File Handling

```yaml
test_id: ADV-005
name: 'Binary File Handling'
difficulty: advanced
category: performance
input:
  binary_directories:
    - dist/
    - build/
    - coverage/
expected:
  files_exclude: binary_directories
validation:
  - Build outputs excluded
```

#### ADV-006: Git Object Exclusion

```yaml
test_id: ADV-006
name: 'Git Object Exclusion'
difficulty: advanced
category: performance
input:
  git_repo: true
expected:
  files_watcherExclude:
    - '**/.git/objects/**'
    - '**/.git/subtree-cache/**'
validation:
  - Git internals excluded from watching
```

#### ADV-007: Memory Configuration Scaling

```yaml
test_id: ADV-007
name: 'Memory Configuration Scaling'
difficulty: advanced
category: performance
input:
  system_ram_gb: 32
  project_size: 'large'
expected:
  files_maxMemoryForLargeFilesMB: 8192
validation:
  - Memory scaled appropriately
```

#### ADV-008: Extension Host Optimization

```yaml
test_id: ADV-008
name: 'Extension Host Optimization'
difficulty: advanced
category: performance
input:
  extension_count: 50
expected:
  extensions_autoUpdate: false
  extensions_autoCheckUpdates: false
validation:
  - Auto-update disabled for stability
```

#### ADV-009: IntelliSense Scope Limiting

```yaml
test_id: ADV-009
name: 'IntelliSense Scope Limiting'
difficulty: advanced
category: performance
input:
  project_type: 'monorepo'
  package_count: 20
expected:
  typescript_preferences_includePackageJsonAutoImports: 'off'
validation:
  - Auto-imports scoped to reduce overhead
```

#### ADV-010: Search Follow Symlinks

```yaml
test_id: ADV-010
name: 'Search Follow Symlinks'
difficulty: advanced
category: performance
input:
  symlinks_present: true
expected:
  search_followSymlinks: false
validation:
  - Symlinks not followed to prevent loops
```

### Category 3.2: Agent Integration (10 tests)

#### ADV-011: Elite Agent Collective Detection

```yaml
test_id: ADV-011
name: 'Elite Agent Collective Detection'
difficulty: advanced
category: agent_integration
input:
  project_files:
    - .github/agents/*.agent.md (40+ files)
    - .github/copilot-instructions.md
expected:
  detected: 'Elite Agent Collective'
  agent_count: 41
  settings:
    - files.associations["*.agent.md"]: 'markdown'
validation:
  - Agent collective detected
  - Correct count
  - File associations set
```

#### ADV-012: Copilot Chat Optimization

```yaml
test_id: ADV-012
name: 'Copilot Chat Optimization'
difficulty: advanced
category: agent_integration
input:
  copilot_enabled: true
expected:
  github.copilot.chat.agent.thinkingProcess: true
  github.copilot.chat.scopeSelection: true
  chat.agent.enabled: true
validation:
  - Agent features enabled
  - Thinking process visible
```

#### ADV-013: Terminal Auto-Approve for pnpm

```yaml
test_id: ADV-013
name: 'Terminal Auto-Approve for pnpm'
difficulty: advanced
category: agent_integration
input:
  package_manager: 'pnpm'
  scripts: ['build', 'test', 'lint']
expected:
  chat.tools.terminal.enableAutoApprove: true
  chat.tools.terminal.autoApproveWorkspaceNpmScripts: true
validation:
  - Auto-approve enabled
  - Workspace scripts approved
```

#### ADV-014: Agent Skills Directory

```yaml
test_id: ADV-014
name: 'Agent Skills Directory'
difficulty: advanced
category: agent_integration
input:
  skills_directory: '.github/skills/'
expected:
  chat.useAgentSkills: true
validation:
  - Skills enabled
```

#### ADV-015: OMNISCIENT Reporting

```yaml
test_id: ADV-015
name: 'OMNISCIENT Reporting'
difficulty: advanced
category: agent_integration
input:
  configuration_applied: true
expected:
  report_generated: true
  report_fields:
    - agent_id: 'VSCODE-ENV'
    - detected_stacks
    - settings_applied
    - extensions_recommended
validation:
  - Report generated for OMNISCIENT
  - All fields present
```

#### ADV-016: Cross-Agent Referral Handling

```yaml
test_id: ADV-016
name: 'Cross-Agent Referral Handling'
difficulty: advanced
category: agent_integration
input:
  referral_from: '@APEX'
  issue: 'TypeScript configuration missing'
expected:
  priority: 'high'
  focused_response: 'typescript'
validation:
  - Referral recognized
  - Focused response generated
```

#### ADV-017: Agent Task Generation

```yaml
test_id: ADV-017
name: 'Agent Task Generation'
difficulty: advanced
category: agent_integration
input:
  agent_collective: true
expected:
  tasks_include:
    - 'Agent: Validate All Agent Specs'
    - 'Agent: Count Agents'
validation:
  - Agent-specific tasks generated
```

#### ADV-018: Copilot Context Optimization

```yaml
test_id: ADV-018
name: 'Copilot Context Optimization'
difficulty: advanced
category: agent_integration
input:
  large_context_files: true
expected:
  files_exclude_from_copilot:
    - '**/*.min.js'
    - '**/vendor/**'
validation:
  - Noisy files excluded from Copilot context
```

#### ADV-019: Multi-Agent Workspace

```yaml
test_id: ADV-019
name: 'Multi-Agent Workspace'
difficulty: advanced
category: agent_integration
input:
  agents_active: ['APEX', 'CIPHER', 'FLUX']
expected:
  configuration_supports_all: true
validation:
  - Configuration doesn't conflict with any agent
```

#### ADV-020: Agent Spec File Association

```yaml
test_id: ADV-020
name: 'Agent Spec File Association'
difficulty: advanced
category: agent_integration
input:
  agent_files: '*.agent.md'
expected:
  files.associations: { '*.agent.md': 'markdown' }
  markdown_preview_enabled: true
validation:
  - Agent specs treated as markdown
```

### Category 3.3: Advanced Scenarios (5 tests)

#### ADV-021: VS Code Extension Development

```yaml
test_id: ADV-021
name: 'VS Code Extension Development'
difficulty: advanced
category: advanced_scenarios
input:
  project_files:
    - package.json (vscode in engines)
    - src/extension.ts
    - .vscode/launch.json (extension host)
expected:
  launch_configurations:
    - 'Run Extension'
    - 'Extension Tests'
  recommended_extensions:
    - connor4312.esbuild-problem-matchers
validation:
  - Extension development detected
  - Debug configs for extension host
```

#### ADV-022: Remote Development Configuration

```yaml
test_id: ADV-022
name: 'Remote Development Configuration'
difficulty: advanced
category: advanced_scenarios
input:
  dev_container_present: true
expected:
  recommended_extensions:
    - ms-vscode-remote.remote-containers
validation:
  - Remote containers detected
```

#### ADV-023: Codespaces Optimization

```yaml
test_id: ADV-023
name: 'Codespaces Optimization'
difficulty: advanced
category: advanced_scenarios
input:
  environment: 'codespaces'
expected:
  settings_optimized_for_web: true
validation:
  - Web-compatible settings
```

#### ADV-024: WSL Integration

```yaml
test_id: ADV-024
name: 'WSL Integration'
difficulty: advanced
category: advanced_scenarios
input:
  wsl_detected: true
expected:
  terminal_integrated_defaultProfile_windows: 'WSL'
validation:
  - WSL as default terminal
```

#### ADV-025: Multi-Platform Project

```yaml
test_id: ADV-025
name: 'Multi-Platform Project'
difficulty: advanced
category: advanced_scenarios
input:
  platforms: ['windows', 'linux', 'macos']
expected:
  platform_agnostic_paths: true
  no_hardcoded_paths: true
validation:
  - Cross-platform compatible
```

---

## TIER 4: EXTREME TESTS (20 tests)

### Category 4.1: Edge Cases (10 tests)

#### EXT-001: 100,000+ File Project

```yaml
test_id: EXT-001
name: '100,000+ File Project'
difficulty: extreme
category: edge_cases
input:
  file_count: 150000
  nested_depth: 20
expected:
  performance_mode: 'aggressive'
  response_time_seconds: '< 30'
validation:
  - Handles massive project
  - Completes in reasonable time
```

#### EXT-002: Deeply Nested Directory Structure

```yaml
test_id: EXT-002
name: 'Deeply Nested Directory Structure'
difficulty: extreme
category: edge_cases
input:
  max_depth: 50
expected:
  no_stack_overflow: true
  scanning_complete: true
validation:
  - Deep recursion handled
```

#### EXT-003: Unicode Paths and Filenames

```yaml
test_id: EXT-003
name: 'Unicode Paths and Filenames'
difficulty: extreme
category: edge_cases
input:
  paths:
    - '项目/源代码/main.ts'
    - 'проект/код/app.py'
    - '🚀/launch.rs'
expected:
  all_paths_handled: true
validation:
  - Unicode paths work correctly
```

#### EXT-004: Symlink Loops

```yaml
test_id: EXT-004
name: 'Symlink Loops'
difficulty: extreme
category: edge_cases
input:
  symlink_loop: 'a -> b -> a'
expected:
  loop_detected: true
  no_infinite_loop: true
validation:
  - Symlink loop detected
  - Agent doesn't hang
```

#### EXT-005: Corrupted Configuration Files

```yaml
test_id: EXT-005
name: 'Corrupted Configuration Files'
difficulty: extreme
category: edge_cases
input:
  corrupted_files:
    - package.json: '{ corrupted'
    - tsconfig.json: null
expected:
  graceful_degradation: true
  partial_detection: true
validation:
  - Handles corruption
  - Still provides value
```

#### EXT-006: Mixed Line Endings

```yaml
test_id: EXT-006
name: 'Mixed Line Endings'
difficulty: extreme
category: edge_cases
input:
  files_with_crlf: 500
  files_with_lf: 500
expected:
  files.eol: 'auto'
  warning_issued: true
validation:
  - Mixed endings detected
  - User warned
```

#### EXT-007: Extremely Long File Paths

```yaml
test_id: EXT-007
name: 'Extremely Long File Paths'
difficulty: extreme
category: edge_cases
input:
  max_path_length: 400
expected:
  path_truncation: graceful
  no_crash: true
validation:
  - Long paths handled
```

#### EXT-008: Read-Only File System

```yaml
test_id: EXT-008
name: 'Read-Only File System'
difficulty: extreme
category: edge_cases
input:
  filesystem: 'read-only'
expected:
  dry_run_mode: true
  recommendations_only: true
validation:
  - Detects read-only
  - Provides recommendations without writing
```

#### EXT-009: Network Drive Project

```yaml
test_id: EXT-009
name: 'Network Drive Project'
difficulty: extreme
category: edge_cases
input:
  path: "\\\\server\\share\\project"
expected:
  network_path_support: true
  performance_warnings: true
validation:
  - Network paths work
  - Performance warnings given
```

#### EXT-010: Git LFS Large Files

```yaml
test_id: EXT-010
name: 'Git LFS Large Files'
difficulty: extreme
category: edge_cases
input:
  lfs_files_gb: 10
expected:
  lfs_detected: true
  large_files_excluded: true
validation:
  - LFS detected
  - Large files excluded from search
```

### Category 4.2: Recovery Scenarios (5 tests)

#### EXT-011: Rollback After Failed Apply

```yaml
test_id: EXT-011
name: 'Rollback After Failed Apply'
difficulty: extreme
category: recovery
input:
  apply_failure: true
  partial_write: true
expected:
  rollback_triggered: true
  original_restored: true
validation:
  - Automatic rollback
  - No data loss
```

#### EXT-012: Recovery from Deleted .vscode

```yaml
test_id: EXT-012
name: 'Recovery from Deleted .vscode'
difficulty: extreme
category: recovery
input:
  vscode_deleted_mid_operation: true
expected:
  recreation: true
  no_crash: true
validation:
  - Handles deletion during operation
```

#### EXT-013: Backup Restoration

```yaml
test_id: EXT-013
name: 'Backup Restoration'
difficulty: extreme
category: recovery
input:
  backup_exists: true
  restore_requested: true
expected:
  backup_restored: true
  integrity_verified: true
validation:
  - Backup restored correctly
  - Files match original
```

#### EXT-014: Merge Conflict in Settings

```yaml
test_id: EXT-014
name: 'Merge Conflict in Settings'
difficulty: extreme
category: recovery
input:
  git_merge_conflict_in_settings: true
expected:
  conflict_detected: true
  resolution_offered: true
validation:
  - Conflict detected
  - Resolution options provided
```

#### EXT-015: Disk Full During Write

```yaml
test_id: EXT-015
name: 'Disk Full During Write'
difficulty: extreme
category: recovery
input:
  disk_full: true
expected:
  error_handled: true
  cleanup_performed: true
validation:
  - Disk full handled gracefully
  - Partial files cleaned up
```

### Category 4.3: Adversarial Inputs (5 tests)

#### EXT-016: Malicious package.json

```yaml
test_id: EXT-016
name: 'Malicious package.json'
difficulty: extreme
category: adversarial
input:
  package_json:
    scripts:
      postinstall: 'rm -rf /'
expected:
  scripts_not_executed: true
  warning_issued: true
validation:
  - Scripts not auto-executed
  - Suspicious scripts flagged
```

#### EXT-017: Injection in Config Values

```yaml
test_id: EXT-017
name: 'Injection in Config Values'
difficulty: extreme
category: adversarial
input:
  config_value: '${env:PATH}'
expected:
  value_sanitized: true
  no_env_expansion: true
validation:
  - Injection prevented
```

#### EXT-018: Oversized Configuration

```yaml
test_id: EXT-018
name: 'Oversized Configuration'
difficulty: extreme
category: adversarial
input:
  settings_size_mb: 50
expected:
  size_limit_enforced: true
  rejection: true
validation:
  - Oversized config rejected
```

#### EXT-019: Circular Dependencies in Settings

```yaml
test_id: EXT-019
name: 'Circular Dependencies in Settings'
difficulty: extreme
category: adversarial
input:
  circular_reference: true
expected:
  circular_detected: true
  no_infinite_loop: true
validation:
  - Circular reference caught
```

#### EXT-020: Conflicting Required Settings

```yaml
test_id: EXT-020
name: 'Conflicting Required Settings'
difficulty: extreme
category: adversarial
input:
  user_requirement: 'formatOnSave: false'
  agent_requirement: 'formatOnSave: true'
expected:
  user_preference_wins: true
  warning_issued: true
validation:
  - User preference respected
  - Trade-off explained
```

---

## Test Execution Summary

### Metrics to Capture

| Metric                       | Description                          |
| ---------------------------- | ------------------------------------ |
| Detection Accuracy           | % of stacks correctly identified     |
| Configuration Validity       | % of generated files that are valid  |
| Conflict Resolution Rate     | % of conflicts successfully resolved |
| Performance (Large Projects) | Time to complete analysis            |
| Recovery Success Rate        | % of recovery scenarios handled      |
| User Acceptance Rate         | % of recommendations accepted        |

### Reporting to OMNISCIENT

```yaml
test_report:
  agent_id: 'VSCODE-ENV'
  test_suite_version: '1.0.0'
  execution_date: '2025-02-03'

  results:
    tier_1_foundation:
      total: 25
      passed: 0
      failed: 0
      skipped: 0
    tier_2_intermediate:
      total: 30
      passed: 0
      failed: 0
      skipped: 0
    tier_3_advanced:
      total: 25
      passed: 0
      failed: 0
      skipped: 0
    tier_4_extreme:
      total: 20
      passed: 0
      failed: 0
      skipped: 0

  overall:
    total_tests: 100
    pass_rate: 0%
    execution_time_seconds: 0

  fitness_score: 0.0
  breakthrough_potential: false
```

---

## Usage Instructions

### Running Tests

```bash
# Run all tests
@ECLIPSE run VSCODE-ENV test suite

# Run specific tier
@ECLIPSE run VSCODE-ENV tier-1 tests

# Run specific category
@ECLIPSE run VSCODE-ENV stack_detection tests

# Run single test
@ECLIPSE run VSCODE-ENV test FND-001
```

### Adding New Tests

1. Follow the YAML schema for test definition
2. Place in appropriate tier/category
3. Include clear validation criteria
4. Update test count summary

---

_Test Suite Generated by @VSCODE-ENV with @ECLIPSE collaboration_
_Elite Agent Collective v3.1_
