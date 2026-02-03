import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/extension.ts'],
  format: ['cjs'],
  target: 'node18',
  outDir: 'dist',
  clean: true,
  dts: false,
  sourcemap: true,
  external: ['vscode'],
  noExternal: ['@nlci/core', '@nlci/shared'],
  minify: false,
  treeshake: true,
});
