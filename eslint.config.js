import js from '@eslint/js'
import globals from 'globals'

export default [
  { ignores: ['node_modules/**', 'export/**', '.release/**'] },
  js.configs.recommended,
  {
    languageOptions: {
      globals: globals.node,
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    rules: {
      'no-unused-vars': [
        'error',
        { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_' }
      ]
    }
  }
]
