# Custom Embedder Tutorial

Learn how to integrate custom code embedding models into NLCI for specialized code analysis, domain-specific detection, or alternative embedding strategies.

## Why Custom Embedders?

**Built-in CodeBERT** (default):

- ✅ General-purpose code understanding
- ✅ Pre-trained on 6 languages
- ✅ Fast and reliable
- ❌ May miss domain-specific patterns

**Custom Embedder**:

- ✅ Domain-specific (e.g., blockchain, ML, embedded systems)
- ✅ Language-specific optimization
- ✅ Fine-tuned for your codebase
- ✅ Proprietary/licensed models
- ❌ Requires model preparation

## Prerequisites

- Node.js ≥ 20
- Python 3.8+ (for model conversion)
- ONNX Runtime (installed with NLCI)
- PyTorch or TensorFlow (if converting models)

## Quick Start: Using a Custom Model

### Option 1: ONNX Model (Recommended)

```typescript
import { CloneDetector, ONNXEmbedder } from '@nlci/core';

// Load custom ONNX model
const embedder = new ONNXEmbedder({
  modelPath: './models/custom-code-embedder.onnx',
  tokenizerPath: './models/tokenizer.json',
  dimensions: 768, // Must match model output
  maxLength: 512,
});

// Create detector with custom embedder
const detector = new CloneDetector({
  embedder: embedder,
  lshConfig: {
    numTables: 20,
    numHashes: 12,
    dimensions: 768, // Must match embedder dimensions
  },
});

// Use normally
const clones = await detector.scanDirectory('./src');
```

### Option 2: Custom Implementation

```typescript
import { ICodeEmbedder, CodeBlock } from '@nlci/core';

class MyCustomEmbedder implements ICodeEmbedder {
  async embed(code: string): Promise<number[]> {
    // Your custom embedding logic
    const embedding = await this.computeEmbedding(code);
    return embedding;
  }

  async embedBatch(codes: string[]): Promise<number[][]> {
    // Batch processing for efficiency
    return Promise.all(codes.map((code) => this.embed(code)));
  }

  getDimensions(): number {
    return 768; // Your embedding dimension
  }

  private async computeEmbedding(code: string): Promise<number[]> {
    // Call external API, model, or custom logic
    // Example: OpenAI embeddings
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: code,
        model: 'text-embedding-3-small',
      }),
    });

    const data = await response.json();
    return data.data[0].embedding;
  }
}

// Use custom embedder
const detector = new CloneDetector({
  embedder: new MyCustomEmbedder(),
  lshConfig: {
    numTables: 20,
    numHashes: 12,
    dimensions: 768,
  },
});
```

## Converting Models to ONNX

### From PyTorch

```python
# convert_model.py
import torch
import torch.onnx
from transformers import AutoModel, AutoTokenizer

# Load your model
model = AutoModel.from_pretrained('your-model-name')
tokenizer = AutoTokenizer.from_pretrained('your-model-name')

# Example input
text = "def hello(): pass"
inputs = tokenizer(text, return_tensors="pt")

# Export to ONNX
torch.onnx.export(
    model,
    tuple(inputs.values()),
    "custom-code-embedder.onnx",
    input_names=['input_ids', 'attention_mask'],
    output_names=['last_hidden_state'],
    dynamic_axes={
        'input_ids': {0: 'batch_size', 1: 'sequence'},
        'attention_mask': {0: 'batch_size', 1: 'sequence'},
        'last_hidden_state': {0: 'batch_size', 1: 'sequence'}
    },
    opset_version=14
)

# Save tokenizer
tokenizer.save_pretrained('./tokenizer')

print("✅ Model converted to ONNX")
```

Run conversion:

```bash
pip install torch transformers onnx
python convert_model.py
```

### From TensorFlow

```python
# convert_tf_model.py
import tensorflow as tf
import tf2onnx

# Load TensorFlow model
model = tf.keras.models.load_model('your_model.h5')

# Convert to ONNX
spec = (tf.TensorSpec((None, 512), tf.int32, name="input"),)
output_path = "custom-code-embedder.onnx"

model_proto, _ = tf2onnx.convert.from_keras(
    model,
    input_signature=spec,
    opset=14,
    output_path=output_path
)

print("✅ TensorFlow model converted to ONNX")
```

### Verify ONNX Model

```python
# verify_onnx.py
import onnx
import onnxruntime as ort
import numpy as np

# Load ONNX model
model = onnx.load("custom-code-embedder.onnx")
onnx.checker.check_model(model)

# Test inference
session = ort.InferenceSession("custom-code-embedder.onnx")

# Example input
input_ids = np.random.randint(0, 50000, (1, 512), dtype=np.int64)
attention_mask = np.ones((1, 512), dtype=np.int64)

# Run inference
outputs = session.run(
    None,
    {
        'input_ids': input_ids,
        'attention_mask': attention_mask
    }
)

print("✅ ONNX model verified")
print(f"Output shape: {outputs[0].shape}")
print(f"Output dtype: {outputs[0].dtype}")
```

## Advanced: Fine-Tuning for Your Domain

### Step 1: Prepare Training Data

```python
# prepare_data.py
import json
from pathlib import Path

def extract_code_pairs(repo_path):
    """Extract similar and dissimilar code pairs."""
    pairs = []

    # Find similar code (e.g., refactored functions)
    # This is domain-specific logic

    pairs.append({
        'code1': 'def process(data): return data.upper()',
        'code2': 'def handle(input): return input.upper()',
        'label': 1,  # Similar
        'type': 'Type-2'
    })

    pairs.append({
        'code1': 'def process(data): return data.upper()',
        'code2': 'def calculate(x, y): return x + y',
        'label': 0,  # Dissimilar
        'type': None
    })

    return pairs

# Save training data
pairs = extract_code_pairs('./src')
with open('training_pairs.json', 'w') as f:
    json.dump(pairs, f, indent=2)
```

### Step 2: Fine-Tune Model

```python
# finetune_model.py
import torch
from transformers import (
    AutoModel, AutoTokenizer,
    Trainer, TrainingArguments
)
from torch.utils.data import Dataset

class CodePairDataset(Dataset):
    def __init__(self, pairs, tokenizer):
        self.pairs = pairs
        self.tokenizer = tokenizer

    def __len__(self):
        return len(self.pairs)

    def __getitem__(self, idx):
        pair = self.pairs[idx]

        # Tokenize both codes
        code1 = self.tokenizer(
            pair['code1'],
            truncation=True,
            padding='max_length',
            max_length=512,
            return_tensors='pt'
        )

        code2 = self.tokenizer(
            pair['code2'],
            truncation=True,
            padding='max_length',
            max_length=512,
            return_tensors='pt'
        )

        return {
            'code1': code1,
            'code2': code2,
            'label': torch.tensor(pair['label'], dtype=torch.float)
        }

# Load base model
model = AutoModel.from_pretrained('microsoft/codebert-base')
tokenizer = AutoTokenizer.from_pretrained('microsoft/codebert-base')

# Load training pairs
with open('training_pairs.json') as f:
    pairs = json.load(f)

# Create dataset
dataset = CodePairDataset(pairs, tokenizer)

# Training arguments
training_args = TrainingArguments(
    output_dir='./finetuned-model',
    num_train_epochs=3,
    per_device_train_batch_size=8,
    learning_rate=2e-5,
    warmup_steps=500,
    weight_decay=0.01,
    logging_dir='./logs',
    save_strategy='epoch'
)

# Train
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=dataset
)

trainer.train()

# Save fine-tuned model
model.save_pretrained('./finetuned-model')
tokenizer.save_pretrained('./finetuned-model')

print("✅ Model fine-tuned successfully")
```

### Step 3: Convert and Use

```bash
# Convert to ONNX
python convert_model.py --model ./finetuned-model

# Use in NLCI
export NLCI_EMBEDDER_MODEL=./finetuned-model.onnx
nlci scan ./src
```

## Real-World Examples

### Example 1: OpenAI Embeddings

```typescript
import OpenAI from 'openai';
import { ICodeEmbedder } from '@nlci/core';

class OpenAIEmbedder implements ICodeEmbedder {
  private client: OpenAI;
  private batchSize = 10;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async embed(code: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      input: code,
      model: 'text-embedding-3-small',
    });

    return response.data[0].embedding;
  }

  async embedBatch(codes: string[]): Promise<number[][]> {
    // Process in batches to respect rate limits
    const results: number[][] = [];

    for (let i = 0; i < codes.length; i += this.batchSize) {
      const batch = codes.slice(i, i + this.batchSize);

      const response = await this.client.embeddings.create({
        input: batch,
        model: 'text-embedding-3-small',
      });

      results.push(...response.data.map((d) => d.embedding));

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return results;
  }

  getDimensions(): number {
    return 1536; // text-embedding-3-small dimension
  }
}

// Usage
const detector = new CloneDetector({
  embedder: new OpenAIEmbedder(process.env.OPENAI_API_KEY!),
  lshConfig: {
    numTables: 20,
    numHashes: 12,
    dimensions: 1536,
  },
});
```

### Example 2: Cohere Embeddings

```typescript
import { CohereClient } from 'cohere-ai';
import { ICodeEmbedder } from '@nlci/core';

class CohereEmbedder implements ICodeEmbedder {
  private client: CohereClient;

  constructor(apiKey: string) {
    this.client = new CohereClient({ token: apiKey });
  }

  async embed(code: string): Promise<number[]> {
    const response = await this.client.embed({
      texts: [code],
      model: 'embed-english-v3.0',
      inputType: 'search_document',
    });

    return response.embeddings[0];
  }

  async embedBatch(codes: string[]): Promise<number[][]> {
    const response = await this.client.embed({
      texts: codes,
      model: 'embed-english-v3.0',
      inputType: 'search_document',
    });

    return response.embeddings;
  }

  getDimensions(): number {
    return 1024; // embed-english-v3.0 dimension
  }
}
```

### Example 3: Local Sentence Transformers

```typescript
import { spawn } from 'child_process';
import { ICodeEmbedder } from '@nlci/core';

class SentenceTransformerEmbedder implements ICodeEmbedder {
  private pythonProcess: any;
  private modelName: string;

  constructor(modelName = 'all-MiniLM-L6-v2') {
    this.modelName = modelName;
    this.initializePython();
  }

  private initializePython() {
    // Start persistent Python process
    this.pythonProcess = spawn('python', [
      '-u', // Unbuffered output
      './scripts/embedder_server.py',
      this.modelName,
    ]);
  }

  async embed(code: string): Promise<number[]> {
    return new Promise((resolve, reject) => {
      // Send code to Python process
      this.pythonProcess.stdin.write(JSON.stringify({ code }) + '\n');

      // Read embedding response
      this.pythonProcess.stdout.once('data', (data: Buffer) => {
        const embedding = JSON.parse(data.toString());
        resolve(embedding);
      });
    });
  }

  async embedBatch(codes: string[]): Promise<number[][]> {
    return Promise.all(codes.map((code) => this.embed(code)));
  }

  getDimensions(): number {
    return 384; // all-MiniLM-L6-v2 dimension
  }

  dispose() {
    this.pythonProcess.kill();
  }
}
```

Python server (`scripts/embedder_server.py`):

```python
# embedder_server.py
import sys
import json
from sentence_transformers import SentenceTransformer

model_name = sys.argv[1]
model = SentenceTransformer(model_name)

print(f"Model {model_name} loaded", file=sys.stderr)

for line in sys.stdin:
    data = json.loads(line)
    code = data['code']

    embedding = model.encode(code).tolist()

    print(json.dumps(embedding), flush=True)
```

## Performance Optimization

### Batch Processing

```typescript
class OptimizedEmbedder implements ICodeEmbedder {
  private cache = new Map<string, number[]>();

  async embedBatch(codes: string[]): Promise<number[][]> {
    // Check cache first
    const uncached = codes.filter((c) => !this.cache.has(c));

    if (uncached.length > 0) {
      // Batch embed uncached codes
      const embeddings = await this.computeBatch(uncached);

      // Update cache
      uncached.forEach((code, i) => {
        this.cache.set(code, embeddings[i]);
      });
    }

    // Return all from cache
    return codes.map((c) => this.cache.get(c)!);
  }

  private async computeBatch(codes: string[]): Promise<number[][]> {
    // Your batching logic
  }
}
```

### Parallel Processing

```typescript
import { Worker } from 'worker_threads';

class ParallelEmbedder implements ICodeEmbedder {
  private workers: Worker[];
  private numWorkers = 4;

  constructor() {
    this.workers = Array.from(
      { length: this.numWorkers },
      () => new Worker('./embedder-worker.js')
    );
  }

  async embedBatch(codes: string[]): Promise<number[][]> {
    // Distribute work across workers
    const chunkSize = Math.ceil(codes.length / this.numWorkers);
    const chunks = [];

    for (let i = 0; i < codes.length; i += chunkSize) {
      chunks.push(codes.slice(i, i + chunkSize));
    }

    // Process in parallel
    const results = await Promise.all(
      chunks.map((chunk, i) => this.processInWorker(this.workers[i], chunk))
    );

    return results.flat();
  }

  private processInWorker(worker: Worker, codes: string[]): Promise<number[][]> {
    return new Promise((resolve) => {
      worker.postMessage({ codes });
      worker.once('message', resolve);
    });
  }
}
```

## Testing Your Custom Embedder

```typescript
import { describe, it, expect } from 'vitest';

describe('CustomEmbedder', () => {
  const embedder = new MyCustomEmbedder();

  it('should produce consistent embeddings', async () => {
    const code = 'function add(a, b) { return a + b; }';

    const embedding1 = await embedder.embed(code);
    const embedding2 = await embedder.embed(code);

    expect(embedding1).toEqual(embedding2);
  });

  it('should have correct dimensions', () => {
    expect(embedder.getDimensions()).toBe(768);
  });

  it('should produce similar embeddings for similar code', async () => {
    const code1 = 'function add(a, b) { return a + b; }';
    const code2 = 'function sum(x, y) { return x + y; }';

    const emb1 = await embedder.embed(code1);
    const emb2 = await embedder.embed(code2);

    const similarity = cosineSimilarity(emb1, emb2);
    expect(similarity).toBeGreaterThan(0.9);
  });

  it('should produce different embeddings for different code', async () => {
    const code1 = 'function add(a, b) { return a + b; }';
    const code2 = 'function sort(arr) { return arr.sort(); }';

    const emb1 = await embedder.embed(code1);
    const emb2 = await embedder.embed(code2);

    const similarity = cosineSimilarity(emb1, emb2);
    expect(similarity).toBeLessThan(0.5);
  });

  it('should batch efficiently', async () => {
    const codes = Array(100).fill('function test() {}');

    const start = Date.now();
    await embedder.embedBatch(codes);
    const batchTime = Date.now() - start;

    const start2 = Date.now();
    await Promise.all(codes.map((c) => embedder.embed(c)));
    const individualTime = Date.now() - start2;

    expect(batchTime).toBeLessThan(individualTime * 0.5);
  });
});

function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magA * magB);
}
```

## Configuration

### Via Config File

```json
{
  "embedder": {
    "type": "onnx",
    "modelPath": "./models/custom-model.onnx",
    "tokenizerPath": "./models/tokenizer.json",
    "dimensions": 768,
    "batchSize": 32,
    "cache": {
      "enabled": true,
      "maxSize": 10000
    }
  },
  "lsh": {
    "numTables": 20,
    "numHashes": 12,
    "dimensions": 768
  }
}
```

### Via Environment Variables

```bash
export NLCI_EMBEDDER_TYPE=onnx
export NLCI_EMBEDDER_MODEL=./models/custom-model.onnx
export NLCI_EMBEDDER_TOKENIZER=./models/tokenizer.json
export NLCI_EMBEDDER_DIMENSIONS=768
```

## Troubleshooting

### Issue: Model dimensions mismatch

**Error**: `Dimension mismatch: expected 768, got 1536`

**Solution**: Update LSH configuration

```typescript
{
  lshConfig: {
    numTables: 20,
    numHashes: 12,
    dimensions: 1536  // Match embedder dimensions
  }
}
```

### Issue: Out of memory during batch processing

**Solution**: Reduce batch size

```typescript
{
  embedder: {
    batchSize: 16; // Reduce from default 32
  }
}
```

### Issue: Slow embedding performance

**Solution**: Enable caching and parallel processing

```typescript
{
  embedder: {
    cache: { enabled: true, maxSize: 20000 },
    parallel: { workers: 4 }
  }
}
```

## Next Steps

- [Performance Tuning Guide](../guides/performance-tuning.md)
- [Configuration Reference](../guides/configuration.md)
- [CI/CD Integration](./ci-integration.md)

## Resources

- [ONNX Runtime Documentation](https://onnxruntime.ai/docs/)
- [Hugging Face Model Hub](https://huggingface.co/models)
- [Sentence Transformers](https://www.sbert.net/)
