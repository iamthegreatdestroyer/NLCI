/**
 * NLCI Basic Usage Example
 * 
 * Demonstrates core functionality:
 * - Indexing code files
 * - Finding clones
 * - Querying for similar code
 * - Generating reports
 */

import { NlciEngine } from '@nlci/core';
import { Logger } from '@nlci/shared';
import * as path from 'path';
import * as fs from 'fs/promises';

const logger = new Logger('example');

async function main() {
  console.log('🔍 NLCI Basic Usage Example\n');

  // 1. Initialize Engine
  console.log('1️⃣  Initializing NLCI Engine...');
  
  const engine = new NlciEngine({
    lsh: {
      numTables: 20,
      numBits: 12,
      embeddingDim: 384,
    },
    similarity: {
      threshold: 0.85,
      minLines: 5,
      maxLines: 500,
    },
    parser: {
      languages: ['typescript', 'javascript'],
    },
  });
  
  console.log('✅ Engine initialized\n');

  // 2. Index Directory
  console.log('2️⃣  Indexing source files...');
  
  const sourceDir = path.join(__dirname, 'src');
  
  const indexResult = await engine.indexDirectory(sourceDir, {
    exclude: ['**/*.test.ts', '**/*.spec.ts'],
    onProgress: (current, total) => {
      const percent = Math.round((current / total) * 100);
      process.stdout.write(`\r   Progress: ${current}/${total} (${percent}%)`);
    },
  });
  
  if (indexResult.isErr()) {
    console.error('\n❌ Indexing failed:', indexResult.error);
    return;
  }
  
  const { filesProcessed, blocksIndexed } = indexResult.value;
  console.log(`\n✅ Indexed ${filesProcessed} files, ${blocksIndexed} code blocks\n`);

  // 3. Find All Clones
  console.log('3️⃣  Finding all clones...');
  
  const clonesResult = await engine.findAllClones();
  
  if (clonesResult.isErr()) {
    console.error('❌ Clone detection failed:', clonesResult.error);
    return;
  }
  
  const clones = clonesResult.value;
  console.log(`✅ Found ${clones.length} clone pairs\n`);

  // Display clone summary
  if (clones.length > 0) {
    console.log('Clone Summary:');
    console.log('─────────────');
    
    const byType = clones.reduce((acc, clone) => {
      acc[clone.cloneType] = (acc[clone.cloneType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
    console.log();

    // Display top 3 clones
    console.log('Top Clones:');
    console.log('──────────');
    
    const topClones = clones
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);
    
    topClones.forEach((clone, i) => {
      console.log(`\n  ${i + 1}. ${clone.cloneType.toUpperCase()} (${(clone.similarity * 100).toFixed(1)}%)`);
      console.log(`     Source: ${clone.source.filePath}:${clone.source.startLine}-${clone.source.endLine}`);
      console.log(`     Target: ${clone.target.filePath}:${clone.target.startLine}-${clone.target.endLine}`);
      console.log(`     Lines:  ${clone.target.endLine - clone.target.startLine + 1}`);
    });
    
    console.log();
  }

  // 4. Query Specific File
  console.log('4️⃣  Querying specific file...');
  
  const queryFile = path.join(sourceDir, 'duplicate.ts');
  
  if (await fileExists(queryFile)) {
    const queryResult = await engine.query({
      filePath: queryFile,
    });
    
    if (queryResult.isErr()) {
      console.error('❌ Query failed:', queryResult.error);
    } else {
      const results = queryResult.value;
      console.log(`✅ Found ${results.length} similar code blocks\n`);
      
      results.forEach((result, i) => {
        console.log(`  ${i + 1}. ${result.cloneType} (${(result.similarity * 100).toFixed(1)}%)`);
        console.log(`     ${result.target.filePath}:${result.target.startLine}-${result.target.endLine}`);
      });
    }
  } else {
    console.log('⚠️  File not found, skipping query');
  }
  
  console.log();

  // 5. Get Statistics
  console.log('5️⃣  Retrieving statistics...');
  
  const statsResult = await engine.getStatistics();
  
  if (statsResult.isErr()) {
    console.error('❌ Failed to get statistics:', statsResult.error);
  } else {
    const stats = statsResult.value;
    
    console.log('✅ Statistics:\n');
    console.log(`   Files indexed:    ${stats.filesIndexed}`);
    console.log(`   Code blocks:      ${stats.codeBlocks}`);
    console.log(`   Clone pairs:      ${stats.clonePairs}`);
    console.log(`   Index size:       ${(stats.indexSizeBytes / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Avg query time:   ${stats.avgQueryTimeMs.toFixed(2)} ms`);
  }
  
  console.log();

  // 6. Save Index
  console.log('6️⃣  Saving index to disk...');
  
  const indexPath = path.join(__dirname, '.nlci', 'index.json');
  
  const saveResult = await engine.saveIndex(indexPath);
  
  if (saveResult.isErr()) {
    console.error('❌ Failed to save index:', saveResult.error);
  } else {
    console.log(`✅ Index saved to ${indexPath}`);
  }
  
  console.log();

  // 7. Advanced: Custom Filtering
  console.log('7️⃣  Advanced: Custom filtering...');
  
  const highSimilarityClones = clones.filter(clone => 
    clone.similarity >= 0.95 && 
    clone.cloneType === 'type-1'
  );
  
  console.log(`✅ Found ${highSimilarityClones.length} high-similarity exact clones`);
  
  const largeClones = clones.filter(clone => {
    const lines = clone.target.endLine - clone.target.startLine + 1;
    return lines >= 20;
  });
  
  console.log(`✅ Found ${largeClones.length} large clones (≥20 lines)\n`);

  // Summary
  console.log('════════════════════════════════════');
  console.log('✅ Example Complete!');
  console.log('════════════════════════════════════\n');
  console.log('Next steps:');
  console.log('  • Try the CLI:           npx @nlci/cli scan ./src');
  console.log('  • View the index:        cat .nlci/index.json');
  console.log('  • Generate HTML report:  npx @nlci/cli report --format html');
  console.log('  • Read the docs:         cat ../docs/api-reference.md\n');
}

// Helper function
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Run example
main().catch((error) => {
  console.error('❌ Example failed:', error);
  process.exit(1);
});
