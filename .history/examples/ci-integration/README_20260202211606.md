# CI Integration Example

This example demonstrates integrating NLCI clone detection into CI/CD pipelines.

## Overview

NLCI can automatically detect code clones in pull requests, blocking merges if duplicates exceed thresholds.

## GitHub Actions Integration

See [`.github/workflows/clone-detection.yml`](./.github/workflows/clone-detection.yml) for a complete workflow.

### Features

- ✅ Automatic clone detection on PRs
- ✅ Fail builds if clones exceed threshold
- ✅ Comment PR with clone report
- ✅ Upload HTML report as artifact
- ✅ Track clone metrics over time

### Setup

1. Copy workflow file to your repository:

```bash
mkdir -p .github/workflows
cp clone-detection.yml .github/workflows/
```

2. Configure threshold in `.nlcirc.json`:

```json
{
  "ci": {
    "failOnClones": true,
    "maxClonePairs": 10,
    "maxClonePercentage": 5.0
  }
}
```

3. Add NLCI to dev dependencies:

```bash
npm install --save-dev @nlci/cli
```

## Workflow Breakdown

### 1. Install & Setup

```yaml
- name: Install NLCI
  run: npm install -g @nlci/cli
```

### 2. Scan for Clones

```yaml
- name: Scan for clones
  run: |
    nlci scan src/ --config .nlcirc.json
    nlci report --format json --output clones.json
```

### 3. Analyze Results

```yaml
- name: Check clone threshold
  run: |
    CLONE_COUNT=$(jq '.clonePairs | length' clones.json)
    if [ $CLONE_COUNT -gt 10 ]; then
      echo "❌ Too many clones: $CLONE_COUNT"
      exit 1
    fi
```

### 4. Generate Report

```yaml
- name: Generate HTML report
  run: nlci report --format html --output clones-report.html
```

### 5. Comment on PR

```yaml
- name: Comment PR
  uses: actions/github-script@v7
  with:
    script: |
      const fs = require('fs');
      const report = JSON.parse(fs.readFileSync('clones.json'));

      const comment = `
      ## 🔍 Clone Detection Report

      **Clone Pairs Found:** ${report.clonePairs.length}

      ${report.clonePairs.map((clone, i) => `
      ### Clone ${i + 1} (${clone.cloneType}, ${(clone.similarity * 100).toFixed(1)}%)
      - Source: \`${clone.source.filePath}:${clone.source.startLine}-${clone.source.endLine}\`
      - Target: \`${clone.target.filePath}:${clone.target.startLine}-${clone.target.endLine}\`
      `).join('\n')}

      [View full report](../artifacts/clones-report.html)
      `;

      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: comment
      });
```

## GitLab CI Integration

For GitLab, add to `.gitlab-ci.yml`:

```yaml
clone-detection:
  stage: test
  image: node:20
  script:
    - npm install -g @nlci/cli
    - nlci scan src/ --config .nlcirc.json
    - nlci report --format json --output clones.json
    - |
      CLONE_COUNT=$(jq '.clonePairs | length' clones.json)
      if [ $CLONE_COUNT -gt 10 ]; then
        echo "Too many clones: $CLONE_COUNT"
        exit 1
      fi
  artifacts:
    reports:
      junit: clones-junit.xml
    paths:
      - clones.json
      - clones-report.html
```

## Jenkins Integration

Add to `Jenkinsfile`:

```groovy
pipeline {
  agent any

  stages {
    stage('Clone Detection') {
      steps {
        sh 'npm install -g @nlci/cli'
        sh 'nlci scan src/ --config .nlcirc.json'
        sh 'nlci report --format json --output clones.json'

        script {
          def report = readJSON file: 'clones.json'
          def cloneCount = report.clonePairs.size()

          if (cloneCount > 10) {
            error("Too many clones found: ${cloneCount}")
          }
        }
      }
    }
  }

  post {
    always {
      publishHTML([
        reportDir: '.',
        reportFiles: 'clones-report.html',
        reportName: 'Clone Detection Report'
      ])
    }
  }
}
```

## CircleCI Integration

Add to `.circleci/config.yml`:

```yaml
version: 2.1

jobs:
  clone-detection:
    docker:
      - image: cimg/node:20.0
    steps:
      - checkout
      - run:
          name: Install NLCI
          command: npm install -g @nlci/cli
      - run:
          name: Scan for clones
          command: |
            nlci scan src/ --config .nlcirc.json
            nlci report --format json --output clones.json
      - run:
          name: Check threshold
          command: |
            CLONE_COUNT=$(jq '.clonePairs | length' clones.json)
            if [ $CLONE_COUNT -gt 10 ]; then
              echo "Too many clones: $CLONE_COUNT"
              exit 1
            fi
      - store_artifacts:
          path: clones-report.html

workflows:
  version: 2
  test:
    jobs:
      - clone-detection
```

## Configuration Options

### CI-Specific Settings

```json
{
  "ci": {
    "enabled": true,
    "failOnClones": true,
    "maxClonePairs": 10,
    "maxClonePercentage": 5.0,
    "commentPRs": true,
    "uploadArtifacts": true
  },
  "similarity": {
    "threshold": 0.9
  }
}
```

### Environment Variables

```bash
NLCI_CI_MODE=true              # Enable CI optimizations
NLCI_FAIL_ON_CLONES=true       # Fail build on clones
NLCI_MAX_CLONE_PAIRS=10        # Maximum allowed clones
NLCI_REPORT_FORMAT=json        # Output format
```

## Advanced: Differential Analysis

Only scan changed files in PRs:

```bash
# Get changed files
CHANGED_FILES=$(git diff --name-only HEAD^ HEAD | grep '.ts$')

# Scan only changed files
for file in $CHANGED_FILES; do
  nlci query "$file"
done
```

## Best Practices

1. **Set Reasonable Thresholds**: Start with 10-20 clone pairs
2. **Exclude Test Files**: Configure `.nlcirc.json` to exclude tests
3. **Cache Index**: Save/load index to speed up CI
4. **Fail Gracefully**: Warning mode before strict enforcement
5. **Track Metrics**: Store clone counts in time-series DB

## Troubleshooting

### CI times out

- Reduce scan scope (exclude node_modules, tests)
- Lower LSH parameters (L=10, K=8)
- Cache the index between runs

### False positives

- Increase similarity threshold (0.90+)
- Increase minLines (10+)
- Add exclusion patterns

### No clones detected

- Check similarity threshold (lower = more results)
- Verify file patterns are correct
- Check logs for parsing errors

## Next Steps

- [Custom Embedder Example](../custom-embedder/)
- [API Reference](../../docs/api-reference.md)
- [Configuration Guide](../../docs/getting-started.md#configuration)
