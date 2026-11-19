import js from '@eslint/js';
import globals from 'globals';
import i18next from 'eslint-plugin-i18next';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  // src/paraglide do Paraglide sinh ra (SDD 3.5), không sửa tay.
  globalIgnores(['dist', 'src/paraglide']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Component do shadcn CLI sinh ra export kèm biến thể (vd buttonVariants) — giữ nguyên code CLI.
    files: ['src/components/ui/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // Song ngữ (SDD 3.5): chữ hiển thị phải đi qua message của Paraglide (`m.*`),
    // không viết chuỗi cứng trong JSX (cả text lẫn thuộc tính như aria-label).
    files: ['src/**/*.tsx'],
    // src/routes/dev chỉ có khi dev (/dev/kit), chữ ở đó là nhãn cho dev.
    ignores: ['src/**/*.test.tsx', 'src/routes/dev/**'],
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': [
        'error',
        {
          framework: 'react',
          mode: 'jsx-only',
          // Chỉ bắt thuộc tính mang chữ hiển thị; className, size, data-* là giá trị kỹ thuật.
          'jsx-attributes': {
            include: [
              'aria-label',
              'aria-description',
              'title',
              'placeholder',
              'alt',
              'label',
            ],
          },
        },
      ],
    },
  },
  {
    // `cn` phải biết token riêng (src/lib/utils.ts); component do shadcn CLI sinh import
    // thẳng từ package `cn`, cần đổi sang '@/lib/utils'.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/utils.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'cn',
              message: "Import cn từ '@/lib/utils' (đã cấu hình token riêng).",
            },
          ],
        },
      ],
    },
  },
]);
