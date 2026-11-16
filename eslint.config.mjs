// Cấu hình ESLint dùng chung cho packages/*. apps/api và apps/web có cấu hình riêng
// (do Nest CLI và create-vite sinh ra).
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', 'apps/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
);
