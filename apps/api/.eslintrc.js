/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: [require.resolve('@zenfocus/config/eslint')],
  parserOptions: {
    project: ['./tsconfig.json', './tsconfig.test.json'],
    tsconfigRootDir: __dirname,
  },
  env: { node: true },
};
