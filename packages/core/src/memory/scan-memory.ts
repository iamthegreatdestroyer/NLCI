/**
 * @nlci/core - Scan Memory (Mem0-inspired persistence)
 *
 * Persists per-file scan history across sessions. On re-scan, files whose
 * content hash hasn't changed are skipped, making incremental scans O(changes)
 * rather than O(total files).
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface ScanEntry {
  filePath: string;
  contentHash: string;
  scannedAt: string;
  blockCount: number;
}

export class ScanMemory {
  private entries: Map<string, ScanEntry> = new Map();
  private readonly memoryFile: string;
  private loaded = false;

  constructor(storagePath: string) {
    this.memoryFile = path.join(storagePath, 'scan-memory.json');
  }

  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const data = await fs.readFile(this.memoryFile, 'utf-8');
      const entries = JSON.parse(data) as ScanEntry[];
      this.entries.clear();
      for (const entry of entries) {
        this.entries.set(entry.filePath, entry);
      }
    } catch {
      // File absent on first run — start empty
    }
    this.loaded = true;
  }

  async save(): Promise<void> {
    const dir = path.dirname(this.memoryFile);
    await fs.mkdir(dir, { recursive: true });
    const entries = Array.from(this.entries.values());
    await fs.writeFile(this.memoryFile, JSON.stringify(entries, null, 2), 'utf-8');
  }

  /** Returns true if the file is new or its content hash has changed since last scan. */
  isChanged(filePath: string, contentHash: string): boolean {
    const entry = this.entries.get(filePath);
    return !entry || entry.contentHash !== contentHash;
  }

  /** Records a completed scan for a file. */
  record(filePath: string, contentHash: string, blockCount: number): void {
    this.entries.set(filePath, {
      filePath,
      contentHash,
      scannedAt: new Date().toISOString(),
      blockCount,
    });
  }

  getHistory(): readonly ScanEntry[] {
    return Array.from(this.entries.values());
  }

  getEntry(filePath: string): ScanEntry | undefined {
    return this.entries.get(filePath);
  }

  forget(filePath: string): void {
    this.entries.delete(filePath);
  }

  clear(): void {
    this.entries.clear();
    this.loaded = false;
  }

  get size(): number {
    return this.entries.size;
  }
}
