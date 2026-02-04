/**
 * Type-3 clones: Structural changes with same algorithm
 */

// Type-3: Modified processArray with additional logging
export function processArrayWithLogging<T>(
  items: T[],
  predicate: (item: T) => boolean,
  logger?: (msg: string) => void
): T[] {
  const result: T[] = [];

  logger?.('Starting to process array');

  for (const item of items) {
    if (predicate(item)) {
      result.push(item);
      logger?.(`Added item to result`);
    }
  }

  logger?.(`Finished processing. Result has ${result.length} items`);
  return result;
}

// Type-3: transformData with uppercase option
export function transformDataEnhanced(input: string, uppercase: boolean = false): string {
  const lines = input.split('\n');
  const processed: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.length === 0) {
      continue;
    }

    const words = line.split(' ');
    const separator = uppercase ? '-' : '_';
    const transformed = words
      .map((word) => (uppercase ? word.toUpperCase() : word.toLowerCase()))
      .join(separator);

    processed.push(`${i}: ${transformed}`);
  }

  return processed.join('\n');
}

// Type-3: DataBuffer with events
export class DataBufferWithEvents<T> {
  private items: T[] = [];
  private capacity: number;
  private onAddCallback?: (item: T) => void;

  constructor(capacity: number = 100, onAdd?: (item: T) => void) {
    this.capacity = capacity;
    this.onAddCallback = onAdd;
  }

  add(item: T): boolean {
    if (this.items.length >= this.capacity) {
      return false;
    }

    this.items.push(item);
    this.onAddCallback?.(item);
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

  getAll(): T[] {
    return [...this.items];
  }
}
