import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'src/generated', 'playwright-report', 'test-results'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // §0.3 — engine & solver are pure TS: no React / three / DOM-bound libraries.
    files: ['src/engine/**/*.ts', 'src/solver/**/*.ts', 'src/systems/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['react', 'react-*', 'react/*', '@react-three/*', 'three', 'three/*', 'zustand', 'zustand/*', 'vaul', 'lucide-react'], message: 'Engine/solver must stay pure TypeScript (§0.3).' },
          { group: ['@/features/*', '@/components/*', '@/pages/*', '@/workers/*'], message: 'Engine/solver must not depend on UI layers.' },
        ],
      }],
      'no-restricted-globals': ['error', 'window', 'document', 'navigator'],
    },
  },
);
