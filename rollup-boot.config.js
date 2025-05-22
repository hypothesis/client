import { babel } from '@rollup/plugin-babel';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

const isProd = process.env.NODE_ENV === 'production';
const prodPlugins = [];
if (isProd) {
  prodPlugins.push(terser());
}

export default {
  input: 'src/boot/index.ts',
  output: {
    file: 'build/boot-template.js',

    // Built as an IIFE rather than ES module because there are many existing
    // <script> tags on websites that load it as a non-module script.
    format: 'iife',

    sourcemap: false,
  },
  preserveEntrySignatures: false,

  treeshake: isProd,

  plugins: [
    babel({
      // Rollup docs recommend against "inline", but for this tiny bundle it
      // produces a prod bundle of the same size and dev bundle that has less cruft in it.
      babelHelpers: 'inline',
      exclude: 'node_modules/**',
      extensions: ['.js', '.ts', '.tsx'],
    }),
    json(),
    nodeResolve({ extensions: ['.js', '.ts', '.tsx'] }),
    ...prodPlugins,
  ],
};
