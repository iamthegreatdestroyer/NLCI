/**
 * Intentional duplicate of some utils.ts functions
 * (for clone detection demonstration)
 */

export function filterItems<T>(array: T[], check: (item: T) => boolean): T[] {
  const output: T[] = [];

  for (const item of array) {
    if (check(item)) {
      output.push(item);
    }
  }

  return output;
}

export function convertText(text: string): string {
  const rows = text.split('\n');
  const results: string[] = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx].trim();

    if (row.length === 0) {
      continue;
    }

    const tokens = row.split(' ');
    const converted = tokens.map((token) => token.toLowerCase()).join('_');

    results.push(`${idx}: ${converted}`);
  }

  return results.join('\n');
}
