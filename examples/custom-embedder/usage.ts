import { NlciEngine } from '@nlci/core';
import { CustomTransformerEmbedder, GraphCodeBERTEmbedder, HybridEmbedder } from './custom-model';

/**
 * Example 1: Using custom transformer embedder
 */
async function example1() {
  console.log('🔹 Example 1: Custom Transformer Embedder\n');

  // Create custom embedder
  const embedder = new CustomTransformerEmbedder({
    modelPath: './models/my-custom-codebert',
    maxLength: 512,
    dimension: 384,
    normalize: true,
  });

  // Initialize
  const initResult = await embedder.initialize();
  if (initResult.isErr()) {
    console.error('Failed to initialize embedder:', initResult.error);
    return;
  }

  // Create engine with custom embedder
  const engine = await NlciEngine.create({
    embeddingModel: embedder,
    similarity: {
      threshold: 0.85,
    },
    lsh: {
      numTables: 20,
      numHashBits: 12,
    },
  });

  if (engine.isErr()) {
    console.error('Failed to create engine:', engine.error);
    return;
  }

  console.log('✅ Engine created with custom embedder');
  console.log(`   Embedding dimension: ${embedder.getDimension()}`);

  // Use engine normally
  const indexResult = await engine.value.indexDirectory('./src');
  if (indexResult.isOk()) {
    console.log(`✅ Indexed ${indexResult.value.filesIndexed} files`);
  }

  // Cleanup
  await embedder.dispose();
}

/**
 * Example 2: Using GraphCodeBERT
 */
async function example2() {
  console.log('\n🔹 Example 2: GraphCodeBERT with AST Features\n');

  const embedder = new GraphCodeBERTEmbedder({
    modelPath: 'microsoft/graphcodebert-base',
    useAst: true, // Include AST structure
    maxLength: 512,
  });

  await embedder.initialize();

  const engine = await NlciEngine.create({
    embeddingModel: embedder,
    similarity: { threshold: 0.85 },
  });

  if (engine.isErr()) {
    console.error('Failed to create engine');
    return;
  }

  console.log('✅ Engine created with GraphCodeBERT');
  console.log('   AST features enabled for better structural understanding');

  await embedder.dispose();
}

/**
 * Example 3: Hybrid embedder combining multiple models
 */
async function example3() {
  console.log('\n🔹 Example 3: Hybrid Embedder (Multiple Models)\n');

  // Create multiple embedders
  const codeBert = new CustomTransformerEmbedder({
    modelPath: './models/codebert',
    dimension: 768,
  });

  const graphCodeBert = new GraphCodeBERTEmbedder({
    useAst: true,
  });

  // Initialize both
  await codeBert.initialize();
  await graphCodeBert.initialize();

  // Create hybrid embedder
  const hybridEmbedder = new HybridEmbedder({
    models: [
      { model: codeBert, weight: 0.6 },
      { model: graphCodeBert, weight: 0.4 },
    ],
    aggregation: 'weighted-average',
  });

  const engine = await NlciEngine.create({
    embeddingModel: hybridEmbedder,
    similarity: { threshold: 0.85 },
  });

  if (engine.isOk()) {
    console.log('✅ Engine created with hybrid embedder');
    console.log('   Combining CodeBERT (60%) + GraphCodeBERT (40%)');
  }

  await hybridEmbedder.dispose();
}

/**
 * Example 4: Benchmarking custom embedder
 */
async function example4() {
  console.log('\n🔹 Example 4: Benchmarking Custom Embedder\n');

  const embedder = new CustomTransformerEmbedder({
    dimension: 384,
  });

  await embedder.initialize();

  // Test embedding generation
  const testCode = `
    function processData(input: string): string {
      return input.trim().toLowerCase();
    }
  `;

  const startTime = performance.now();
  const result = await embedder.embed(testCode);
  const endTime = performance.now();

  if (result.isOk()) {
    console.log('✅ Embedding generated');
    console.log(`   Dimension: ${result.value.length}`);
    console.log(`   Time: ${(endTime - startTime).toFixed(2)}ms`);
    console.log(
      `   Sample values: [${Array.from(result.value.slice(0, 5))
        .map((v) => v.toFixed(4))
        .join(', ')}...]`
    );
  }

  await embedder.dispose();
}

/**
 * Main entry point
 */
async function main() {
  console.log('🚀 Custom Embedder Examples\n');
  console.log('='.repeat(50));

  try {
    await example1();
    await example2();
    await example3();
    await example4();

    console.log('\n' + '='.repeat(50));
    console.log('✅ All examples completed successfully!');
    console.log('\nNext steps:');
    console.log('  1. Fine-tune a model on your codebase');
    console.log('  2. Benchmark against default CodeBERT');
    console.log('  3. Deploy to production');
  } catch (error) {
    console.error('❌ Error running examples:', error);
    process.exit(1);
  }
}

// Run examples
main();
