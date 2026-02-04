/**
 * Type-2 clones: Same structure, only identifiers renamed
 */

// Type-2: Renamed version of processArray
export function filterElements<TItem>(
  collection: TItem[],
  filterFn: (element: TItem) => boolean
): TItem[] {
  const output: TItem[] = [];

  for (const element of collection) {
    if (filterFn(element)) {
      output.push(element);
    }
  }

  return output;
}

// Type-2: Renamed version of transformData
export function processText(rawInput: string): string {
  const rows = rawInput.split('\n');
  const outputLines: string[] = [];

  for (let lineNum = 0; lineNum < rows.length; lineNum++) {
    const row = rows[lineNum].trim();

    if (row.length === 0) {
      continue;
    }

    const tokens = row.split(' ');
    const formattedLine = tokens.map((token) => token.toLowerCase()).join('_');

    outputLines.push(`${lineNum}: ${formattedLine}`);
  }

  return outputLines.join('\n');
}

// Type-2: Renamed DataBuffer
export class ItemContainer<TValue> {
  private elements: TValue[] = [];
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  insert(value: TValue): boolean {
    if (this.elements.length >= this.maxSize) {
      return false;
    }

    this.elements.push(value);
    return true;
  }

  retrieve(position: number): TValue | undefined {
    return this.elements[position];
  }

  reset(): void {
    this.elements = [];
  }

  count(): number {
    return this.elements.length;
  }
}
