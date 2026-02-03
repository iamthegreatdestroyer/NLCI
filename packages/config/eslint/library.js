/**
 * @nlci/config - Library ESLint Configuration
 *
 * ESLint configuration optimized for library packages.
 */

/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['./base.js'],
  rules: {
    // Stricter rules for libraries
    '@typescript-eslint/explicit-function-return-type': [
      'warn',
      {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
        allowHigherOrderFunctions: true,
        allowDirectConstAssertionInArrowFunctions: true,
      },
    ],
    '@typescript-eslint/explicit-module-boundary-types': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',

    // Ensure proper exports
    'import/no-default-export': 'error',

    // Documentation
    'valid-jsdoc': 'off', // Use TypeScript for documentation
  },
  overrides: [
    {
      // Allow default exports in config files
      files: ['*.config.ts', '*.config.js', '*.config.mjs'],
      rules: {
        'import/no-default-export': 'off',
      },
    },
    {
      // Relax rules for tests
      files: ['**/*.test.ts', '**/*.spec.ts', '**/tests/**'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
      },
    },
  ],
};
