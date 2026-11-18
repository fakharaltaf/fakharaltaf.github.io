import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'bin', 'node_modules', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  reactHooks.configs.flat['recommended-latest'],
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      // noUncheckedIndexedAccess makes `!` the honest way to index fixed-size arrays.
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    // R3F's frame loop mutates three.js objects in place by design; that's the whole point of useFrame.
    files: ['src/world/**/*.tsx'],
    rules: { 'react-hooks/immutability': 'off' },
  },
)
