import { readFileSync } from 'fs';

import { babel } from '@rollup/plugin-babel';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import replace from '@rollup/plugin-replace';
import { terser } from 'rollup-plugin-terser';

const isProd = process.env.NODE_ENV === 'production';
const prodPlugins = [];
if (isProd) {
  prodPlugins.push(terser());
}

const { version } = JSON.parse(readFileSync('./package.json').toString());

// URL template which is expanded by the boot script. See `src/boot/url-template.js`.
const localhost = '{current_scheme}://{current_host}';

const notebookAppUrl = process.env.NOTEBOOK_APP_URL
  ? `${process.env.NOTEBOOK_APP_URL}`
  : `${localhost}:5000/notebook`;

const sidebarAppUrl = process.env.SIDEBAR_APP_URL
  ? `${process.env.SIDEBAR_APP_URL}`
  : `${localhost}:5000/app.html`;

// nb. Replace `isProd` with `false` here to test a production build of the client
// served locally.
const assetRoot = isProd
  ? `https://cdn.hypothes.is/hypothesis/${version}/`
  : `${localhost}:3001/hypothesis/${version}/`;

export default {
  input: 'src/boot/index.js',
  output: {
    file: 'build/boot.js',

    // Built as an IIFE rather than ES module because there are many existing
    // <script> tags on websites that load it as a non-module script.
    format: 'iife',

    sourcemap: false,
  },
  preserveEntrySignatures: false,

  treeshake: isProd,

  plugins: [
    replace({
      preventAssignment: true,
      values: {
        __ASSET_ROOT__: assetRoot,
        __NOTEBOOK_APP_URL__: notebookAppUrl,
        __SIDEBAR_APP_URL__: sidebarAppUrl,
      },
    }),
    babel({
      // Rollup docs recommend against "inline", but for this tiny bundle it
      // produces a prod bundle of the same size and dev bundle that has less cruft in it.
      babelHelpers: 'inline',

      exclude: 'node_modules/**',
    }),
    json(),
    nodeResolve(),
    ...prodPlugins,
  ],
};
