/**
 * Helper functions
 */

export function calculateSum(numbers: number[]): number {
  let total = 0;

  for (const num of numbers) {
    total += num;
  }

  return total;
}

export function findMax(numbers: number[]): number | undefined {
  if (numbers.length === 0) {
    return undefined;
  }

  let max = numbers[0];

  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i] > max) {
      max = numbers[i];
    }
  }

  return max;
}

export class StringHelper {
  static capitalize(str: string): string {
    if (str.length === 0) {
      return str;
    }

    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  static repeat(str: string, count: number): string {
    let result = '';

    for (let i = 0; i < count; i++) {
      result += str;
    }

    return result;
  }
}
