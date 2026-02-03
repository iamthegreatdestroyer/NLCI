/**
 * Sample utility functions for demonstration
 */

export function processArray<T>(items: T[], predicate: (item: T) => boolean): T[] {
  const result: T[] = [];

  for (const item of items) {
    if (predicate(item)) {
      result.push(item);
    }
  }

  return result;
}

export function transformData(input: string): string {
  const lines = input.split('\n');
  const processed: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.length === 0) {
      continue;
    }

    const words = line.split(' ');
    const transformed = words.map((word) => word.toLowerCase()).join('_');

    processed.push(`${i}: ${transformed}`);
  }

  return processed.join('\n');
}

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
