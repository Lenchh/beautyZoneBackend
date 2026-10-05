import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(eslint.configs.recommended, ...tseslint.configs.recommended, {
  rules: {
    'no-console': 'warn', // Предупреждать, если забыли убрать console.log
    '@typescript-eslint/no-unused-vars': 'error', // Ошибка, если создали переменную, но не используем
    '@typescript-eslint/no-explicit-any': 'warn', // Предупреждать при использовании типа 'any'
  },
});
