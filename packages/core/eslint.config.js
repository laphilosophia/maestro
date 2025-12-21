import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // RFC Guard Rails: Forbidden patterns in core logic
      'no-restricted-syntax': [
        'error',
        {
          selector: 'AwaitExpression',
          message:
            'RFC-0 violation: async/await forbidden in core logic. Use fire-and-forget dispatch.',
        },
        {
          selector: 'NewExpression[callee.name="Promise"]',
          message: 'RFC-0 violation: Promise constructor forbidden. Dispatch must be synchronous.',
        },
        {
          selector: 'CallExpression[callee.name="setTimeout"]',
          message:
            'RFC-0 violation: setTimeout forbidden in decision logic. Use external TTL management.',
        },
        {
          selector: 'CallExpression[callee.name="setInterval"]',
          message: 'RFC-0 violation: setInterval forbidden.',
        },
      ],
      // Strict return type enforcement
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    ignores: ['dist/', 'node_modules/', '*.config.ts'],
  }
)
