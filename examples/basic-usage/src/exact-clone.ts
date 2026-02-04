/**
 * Exact clones (Type-1) for testing
 */

// Type-1: Exact copy of processArray from utils.ts
export function processArray<T>(items: T[], predicate: (item: T) => boolean): T[] {
  const result: T[] = [];

  for (const item of items) {
    if (predicate(item)) {
      result.push(item);
    }
  }

  return result;
}

// Type-1: Exact copy of DataBuffer class
export class DataBuffer<T> {
  private items: T[] = [];
  private capacity: number;

  constructor(capacity: number = 100) {
    this.capacity = capacity;
  }

  add(item: T): boolean {
    if (this.items.length >= this.capacity) {
      return false;
    }

    this.items.push(item);
    return true;
  }

  get(index: number): T | undefined {
    return this.items[index];
  }

  clear(): void {
    this.items = [];
  }

  size(): number {
    return this.items.length;
  }
}
