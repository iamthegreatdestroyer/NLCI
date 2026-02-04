# CI/CD Integration Tutorial

Learn how to integrate NLCI into your Continuous Integration and Continuous Deployment pipelines to automatically detect code clones on every commit.

## Benefits of CI/CD Integration

- ✅ **Prevent clone accumulation** before merging
- ✅ **Enforce code quality standards** automatically
- ✅ **Track clone metrics** over time
- ✅ **Block PRs** with excessive duplication
- ✅ **Generate reports** for code reviews

## GitHub Actions Integration

### Step 1: Create Workflow File

Create `.github/workflows/nlci-scan.yml`:

```yaml
name: NLCI Clone Detection

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  clone-detection:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install NLCI
        run: npm install -g @nlci/cli

      - name: Scan for clones
        run: |
          nlci scan ./src \
            --threshold 0.85 \
            --output clones.json \
            --format json

      - name: Check clone threshold
        run: |
          CLONE_COUNT=$(jq '.cloneGroups | length' clones.json)
          echo "Found $CLONE_COUNT clone groups"

          if [ "$CLONE_COUNT" -gt 10 ]; then
            echo "::error::Too many clone groups detected ($CLONE_COUNT)"
            exit 1
          fi

      - name: Upload clone report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: clone-report
          path: |
            clones.json
            report.html
          retention-days: 30

      - name: Comment PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const clones = JSON.parse(fs.readFileSync('clones.json', 'utf8'));
            const count = clones.cloneGroups.length;

            const body = `## 🔍 NLCI Clone Detection

            **Result**: ${count <= 10 ? '✅ Passed' : '❌ Failed'}
            **Clone Groups**: ${count}
            **Threshold**: 10 groups maximum

            ${count > 0 ? '### Top Clones\n' + clones.cloneGroups.slice(0, 5).map((g, i) => 
              `${i + 1}. \`${g.representative.filePath}:${g.representative.startLine}\` (${g.instances.length} instances)`
            ).join('\n') : 'No clones detected! 🎉'}

            [View Full Report](../actions/runs/${context.runId})
            `;

            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body
            });
```

### Step 2: Configure Clone Thresholds

Create `.nlcirc.json` in your repository root:

```json
{
  "include": ["src/**/*.ts", "src/**/*.js"],
  "exclude": [
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/node_modules/**",
    "**/dist/**",
    "**/__tests__/**"
  ],
  "threshold": 0.85,
  "ci": {
    "maxCloneGroups": 10,
    "maxDuplicationRate": 0.1,
    "failOnType1": true,
    "failOnType2": false,
    "reportFormat": "json"
  }
}
```

### Step 3: Advanced: Diff-Based Scanning

Only scan changed files in PR:

```yaml
- name: Get changed files
  id: changed-files
  uses: tj-actions/changed-files@v41
  with:
    files: |
      src/**/*.ts
      src/**/*.js

- name: Scan changed files
  if: steps.changed-files.outputs.any_changed == 'true'
  run: |
    echo "Scanning: ${{ steps.changed-files.outputs.all_changed_files }}"
    nlci scan ${{ steps.changed-files.outputs.all_changed_files }} \
      --threshold 0.90 \
      --output clones.json
```

## GitLab CI Integration

### .gitlab-ci.yml

```yaml
stages:
  - test
  - report

clone-detection:
  stage: test
  image: node:20
  before_script:
    - npm install -g @nlci/cli
  script:
    - nlci scan ./src --threshold 0.85 --output clones.json
    - CLONE_COUNT=$(jq '.cloneGroups | length' clones.json)
    - echo "Clone groups detected - $CLONE_COUNT"
    - |
      if [ "$CLONE_COUNT" -gt 10 ]; then
        echo "Error: Too many clone groups ($CLONE_COUNT > 10)"
        exit 1
      fi
  artifacts:
    paths:
      - clones.json
    expire_in: 30 days
    when: always
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == "main"'

generate-report:
  stage: report
  image: node:20
  dependencies:
    - clone-detection
  script:
    - npm install -g @nlci/cli
    - nlci report --input clones.json --output report.html
  artifacts:
    paths:
      - report.html
    expire_in: 30 days
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
```

## Jenkins Integration

### Jenkinsfile

```groovy
pipeline {
    agent any

    tools {
        nodejs 'Node 20'
    }

    stages {
        stage('Install NLCI') {
            steps {
                sh 'npm install -g @nlci/cli'
            }
        }

        stage('Scan Clones') {
            steps {
                script {
                    sh 'nlci scan ./src --threshold 0.85 --output clones.json'

                    def clones = readJSON file: 'clones.json'
                    def count = clones.cloneGroups.size()

                    echo "Found ${count} clone groups"

                    if (count > 10) {
                        error("Too many clone groups detected: ${count}")
                    }
                }
            }
        }

        stage('Generate Report') {
            steps {
                sh 'nlci report --output report.html'
            }
        }

        stage('Archive Results') {
            steps {
                archiveArtifacts artifacts: 'clones.json,report.html',
                                 allowEmptyArchive: true

                publishHTML([
                    reportDir: '.',
                    reportFiles: 'report.html',
                    reportName: 'NLCI Clone Report',
                    keepAll: true
                ])
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}
```

## Azure Pipelines Integration

### azure-pipelines.yml

```yaml
trigger:
  branches:
    include:
      - main
      - develop

pr:
  branches:
    include:
      - main
      - develop

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '20.x'
    displayName: 'Install Node.js'

  - script: |
      npm install -g @nlci/cli
    displayName: 'Install NLCI'

  - script: |
      nlci scan ./src \
        --threshold 0.85 \
        --output $(Build.ArtifactStagingDirectory)/clones.json
    displayName: 'Scan for code clones'

  - script: |
      CLONE_COUNT=$(jq '.cloneGroups | length' $(Build.ArtifactStagingDirectory)/clones.json)
      echo "##vso[task.setvariable variable=CloneCount]$CLONE_COUNT"
      echo "Found $CLONE_COUNT clone groups"

      if [ "$CLONE_COUNT" -gt 10 ]; then
        echo "##vso[task.logissue type=error]Too many clone groups: $CLONE_COUNT"
        exit 1
      fi
    displayName: 'Check clone threshold'

  - script: |
      nlci report \
        --input $(Build.ArtifactStagingDirectory)/clones.json \
        --output $(Build.ArtifactStagingDirectory)/report.html
    displayName: 'Generate clone report'
    condition: always()

  - task: PublishBuildArtifacts@1
    inputs:
      pathToPublish: '$(Build.ArtifactStagingDirectory)'
      artifactName: 'clone-detection'
    displayName: 'Publish artifacts'
    condition: always()
```

## CircleCI Integration

### .circleci/config.yml

```yaml
version: 2.1

executors:
  node-executor:
    docker:
      - image: cimg/node:20.0

jobs:
  clone-detection:
    executor: node-executor
    steps:
      - checkout

      - restore_cache:
          keys:
            - nlci-{{ checksum "package-lock.json" }}

      - run:
          name: Install NLCI
          command: npm install -g @nlci/cli

      - save_cache:
          key: nlci-{{ checksum "package-lock.json" }}
          paths:
            - ~/.npm

      - run:
          name: Scan for clones
          command: |
            nlci scan ./src \
              --threshold 0.85 \
              --output clones.json

      - run:
          name: Check thresholds
          command: |
            CLONE_COUNT=$(jq '.cloneGroups | length' clones.json)
            echo "Clone groups: $CLONE_COUNT"

            if [ "$CLONE_COUNT" -gt 10 ]; then
              echo "Error: Too many clone groups"
              exit 1
            fi

      - run:
          name: Generate report
          command: nlci report --output report.html
          when: always

      - store_artifacts:
          path: clones.json
          destination: clone-detection

      - store_artifacts:
          path: report.html
          destination: clone-detection

workflows:
  version: 2
  build-and-test:
    jobs:
      - clone-detection
```

## Custom Reporting Scripts

### Node.js Script

```javascript
// scripts/analyze-clones.js
const fs = require('fs');
const path = require('path');

const clones = JSON.parse(fs.readFileSync('clones.json', 'utf8'));

// Calculate metrics
const metrics = {
  totalCloneGroups: clones.cloneGroups.length,
  totalInstances: clones.cloneGroups.reduce((sum, g) => sum + g.instances.length, 0),
  duplicateLines: clones.cloneGroups.reduce(
    (sum, g) => sum + g.instances.reduce((s, i) => s + (i.endLine - i.startLine + 1), 0),
    0
  ),
  type1: clones.cloneGroups.filter((g) => g.type === 'Type-1').length,
  type2: clones.cloneGroups.filter((g) => g.type === 'Type-2').length,
  type3: clones.cloneGroups.filter((g) => g.type === 'Type-3').length,
};

// Calculate duplication rate
const totalLines = 50000; // Get from cloc or similar
metrics.duplicationRate = metrics.duplicateLines / totalLines;

// Output formatted results
console.log('📊 Clone Detection Metrics');
console.log('─'.repeat(50));
console.log(`Clone Groups:     ${metrics.totalCloneGroups}`);
console.log(`Clone Instances:  ${metrics.totalInstances}`);
console.log(`Duplicate Lines:  ${metrics.duplicateLines}`);
console.log(`Duplication Rate: ${(metrics.duplicationRate * 100).toFixed(2)}%`);
console.log('');
console.log('Clone Type Distribution:');
console.log(`  Type-1 (Exact):    ${metrics.type1}`);
console.log(`  Type-2 (Renamed):  ${metrics.type2}`);
console.log(`  Type-3 (Modified): ${metrics.type3}`);

// Exit with error if thresholds exceeded
if (metrics.totalCloneGroups > 10) {
  console.error('\n❌ Error: Clone group threshold exceeded');
  process.exit(1);
}

if (metrics.duplicationRate > 0.1) {
  console.error('\n❌ Error: Duplication rate exceeds 10%');
  process.exit(1);
}

console.log('\n✅ Clone detection passed!');
```

### Usage in CI

```yaml
- name: Analyze clones
  run: node scripts/analyze-clones.js
```

## Best Practices

### 1. Progressive Enforcement

Start lenient, gradually tighten:

```json
{
  "ci": {
    "maxCloneGroups": 50, // Week 1-2
    "maxDuplicationRate": 0.2 // 20% duplication OK
  }
}
```

Then tighten every sprint:

```json
{
  "ci": {
    "maxCloneGroups": 10, // After cleanup
    "maxDuplicationRate": 0.1 // 10% target
  }
}
```

### 2. Scan Strategy

**Pull Requests**: Strict thresholds

```bash
nlci scan ./src --threshold 0.95  # Only exact clones
```

**Main Branch**: Moderate thresholds

```bash
nlci scan ./src --threshold 0.85  # All clone types
```

**Nightly Builds**: Comprehensive analysis

```bash
nlci scan ./src --threshold 0.70  # Include semantic clones
```

### 3. Failure Policies

**Block**: Critical clones only

```yaml
failOnType1: true # Exact clones = block
failOnType2: false # Renamed = warn
failOnType3: false # Modified = info
```

**Report**: Non-blocking feedback

```yaml
failOnAny: false
generateReport: true
commentOnPR: true
```

### 4. Caching

Speed up CI with cache:

```yaml
- name: Cache NLCI models
  uses: actions/cache@v4
  with:
    path: ~/.nlci/models
    key: nlci-models-${{ hashFiles('**/package-lock.json') }}
```

### 5. Scheduled Scans

Weekly comprehensive analysis:

```yaml
on:
  schedule:
    - cron: '0 0 * * 0' # Every Sunday midnight
  workflow_dispatch: # Manual trigger
```

## Monitoring Trends

### Track Metrics Over Time

```javascript
// Store metrics in database or file
const history = JSON.parse(fs.readFileSync('clone-history.json', 'utf8'));

history.push({
  date: new Date().toISOString(),
  commit: process.env.GITHUB_SHA,
  metrics: metrics,
});

fs.writeFileSync('clone-history.json', JSON.stringify(history, null, 2));
```

### Visualize Trends

Generate trend graphs with Chart.js or similar:

```javascript
// Generate trend chart
const dates = history.map((h) => h.date);
const counts = history.map((h) => h.metrics.totalCloneGroups);
const rates = history.map((h) => h.metrics.duplicationRate);

// Export to visualization tool
```

## Troubleshooting

### Issue: CI runs too slow

**Solution**: Scan only changed files

```bash
git diff --name-only origin/main | grep -E '\.(ts|js)$' | xargs nlci scan
```

### Issue: Too many false positives

**Solution**: Adjust threshold or exclude patterns

```json
{
  "threshold": 0.9,
  "exclude": ["**/generated/**", "**/*.config.ts"]
}
```

### Issue: Out of memory

**Solution**: Reduce batch size

```bash
nlci scan ./src --batch-size 50
```

## Next Steps

- [Performance Tuning Guide](../guides/performance-tuning.md)
- [Configuration Reference](../guides/configuration.md)
- [Custom Embedder Tutorial](./custom-embedder.md)

## Resources

- [GitHub Actions Documentation](https://docs.github.com/actions)
- [GitLab CI/CD Documentation](https://docs.gitlab.com/ee/ci/)
- [Jenkins Pipeline Documentation](https://www.jenkins.io/doc/book/pipeline/)
