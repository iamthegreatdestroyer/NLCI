/**
 * @nlci/core - ChromaDB Storage Backend
 *
 * BucketStorage implementation backed by ChromaDB (Rust rewrite, 4x faster than Python).
 * Requires the `chromadb` npm package and a running ChromaDB server.
 *
 * Install: pnpm add chromadb
 * Server:  docker run -p 8000:8000 chromadb/chroma
 */

import type { ChromaClient } from 'chromadb';
import type { BucketStorage } from './bucket-store.js';

type ChromaCollection = Awaited<ReturnType<ChromaClient['getOrCreateCollection']>>;

export interface ChromaStorageOptions {
  /** ChromaDB server URL. @default 'http://localhost:8000' */
  url?: string;
  /** Collection name to store LSH buckets. @default 'nlci_buckets' */
  collectionName?: string;
  /** ChromaDB tenant. @default 'default_tenant' */
  tenant?: string;
  /** ChromaDB database. @default 'default_database' */
  database?: string;
}

export class ChromaStorage implements BucketStorage {
  private readonly url: string;
  private readonly collectionName: string;
  private readonly tenant: string;
  private readonly database: string;
  private collection: ChromaCollection | null = null;

  constructor(options: ChromaStorageOptions = {}) {
    this.url = options.url ?? 'http://localhost:8000';
    this.collectionName = options.collectionName ?? 'nlci_buckets';
    this.tenant = options.tenant ?? 'default_tenant';
    this.database = options.database ?? 'default_database';
  }

  private async getCollection(): Promise<ChromaCollection> {
    if (!this.collection) {
      let Client: typeof ChromaClient;
      try {
        const mod = await import('chromadb');
        Client = mod.ChromaClient;
      } catch {
        throw new Error(
          'chromadb package is not installed.\n' +
            'Install it with: pnpm add chromadb\n' +
            'Start the server: docker run -p 8000:8000 chromadb/chroma'
        );
      }

      const client = new Client({
        path: this.url,
        tenant: this.tenant,
        database: this.database,
      });
      this.collection = await client.getOrCreateCollection({ name: this.collectionName });
    }
    return this.collection;
  }

  async save(key: string, data: string): Promise<void> {
    const col = await this.getCollection();
    await col.upsert({ ids: [key], documents: [data] });
  }

  async load(key: string): Promise<string | null> {
    const col = await this.getCollection();
    const result = await col.get({ ids: [key] });
    const doc = result.documents?.[0];
    return typeof doc === 'string' ? doc : null;
  }

  async delete(key: string): Promise<void> {
    const col = await this.getCollection();
    await col.delete({ ids: [key] });
  }

  async list(): Promise<string[]> {
    const col = await this.getCollection();
    const result = await col.get({});
    return result.ids ?? [];
  }

  async exists(key: string): Promise<boolean> {
    const col = await this.getCollection();
    const result = await col.get({ ids: [key] });
    return (result.ids?.length ?? 0) > 0;
  }
}
