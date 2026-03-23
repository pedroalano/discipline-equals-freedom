/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['next/core-web-vitals', require.resolve('@zenfocus/config/eslint')],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
};
