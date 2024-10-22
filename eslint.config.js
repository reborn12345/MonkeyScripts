import { defineConfig } from 'eslint';

export default defineConfig({
    languageOptions: {
        globals: {
            // Définis les variables globales si nécessaire
            window: 'readonly',
            document: 'readonly',
        },
        parserOptions: {
            ecmaVersion: 12,
            sourceType: 'module',
        },
    },
    rules: {
        // Ajoute ici des règles personnalisées si nécessaire
        'no-console': 'warn',
        'no-unused-vars': 'warn',
    },
    // Ajoute ici d'autres options de configuration si nécessaire
});
