import tseslint from 'typescript-eslint';

export default tseslint.config(
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    {
        languageOptions: {
            parserOptions: {
                project: "./tsconfig.eslint.json",
            }
        },
    }
)