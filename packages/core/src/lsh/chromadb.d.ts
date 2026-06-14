/**
 * Minimal ambient declarations for the optional `chromadb` peer dependency.
 * The full types come from the installed package when present.
 */
declare module 'chromadb' {
  interface ChromaCollection {
    upsert(params: { ids: string[]; documents: string[] }): Promise<void>;
    get(params: { ids?: string[] }): Promise<{ ids: string[]; documents: (string | null)[] }>;
    delete(params: { ids: string[] }): Promise<void>;
  }

  interface ChromaClientOptions {
    path?: string;
    tenant?: string;
    database?: string;
  }

  export class ChromaClient {
    constructor(options?: ChromaClientOptions);
    getOrCreateCollection(options: { name: string }): Promise<ChromaCollection>;
  }
}
