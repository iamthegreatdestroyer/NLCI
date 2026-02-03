/**
 * @nlci/cli - Path Utilities
 */

import path from 'path';

/**
 * Resolve glob patterns relative to a base path.
 */
export function resolveGlobs(basePath: string, patterns: string[]): string[] {
  return patterns.map((pattern) => {
    if (path.isAbsolute(pattern)) {
      return pattern;
    }
    return path.join(basePath, pattern);
  });
}

/**
 * Get relative path from base to target.
 */
export function getRelativePath(basePath: string, targetPath: string): string {
  return path.relative(basePath, targetPath);
}

/**
 * Normalize path separators to forward slashes.
 */
export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

/**
 * Get file extension without the dot.
 */
export function getExtension(filePath: string): string {
  const ext = path.extname(filePath);
  return ext.startsWith('.') ? ext.slice(1) : ext;
}

/**
 * Check if a path matches any of the given glob patterns.
 */
export function matchesPatterns(
  filePath: string,
  patterns: string[],
): boolean {
  const normalized = normalizePath(filePath);

  for (const pattern of patterns) {
    // Simple glob matching (can be enhanced with minimatch)
    const regex = globToRegex(pattern);
    if (regex.test(normalized)) {
      return true;
    }
  }

  return false;
}

/**
 * Convert a simple glob pattern to a regex.
 */
function globToRegex(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '{{DOUBLE_STAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '.')
    .replace(/{{DOUBLE_STAR}}/g, '.*');

  return new RegExp(`^${escaped}$`);
}
