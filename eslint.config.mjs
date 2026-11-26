import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  ...nextVitals,
  ...tseslint.configs.recommended,
  {
    settings: { next: { rootDir: 'frontend/' } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
    },
  },
  globalIgnores([
    '**/dist/**',
    '**/.next/**',
    '**/next-env.d.ts',
    'coverage/**',
  ]),
]);
