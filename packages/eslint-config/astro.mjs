import baseConfig from './base.mjs';
import eslintPluginAstro from 'eslint-plugin-astro';

export default [
  ...baseConfig,
  ...eslintPluginAstro.configs.recommended,
  {
    ignores: ['.astro/**'],
  },
];
