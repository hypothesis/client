import alias from '@rollup/plugin-alias';
import { babel } from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import { string } from 'rollup-plugin-string';
import { terser } from 'rollup-plugin-terser';
import virtual from '@rollup/plugin-virtual';

const isProd = process.env.NODE_ENV === 'production';
const prodPlugins = [];
if (isProd) {
  prodPlugins.push(terser());

  // Eliminate debug-only imports.
  prodPlugins.push(
    virtual({
      'preact/debug': '',
    })
  );
}

function bundleConfig({ name, entry, format = 'es' }) {
  return {
    input: {
      [name]: entry,
    },
    output: {
      dir: 'build/scripts/',
      format,
      chunkFileNames: `${name}-[name].bundle.js`,
      entryFileNames: '[name].bundle.js',
      sourcemap: true,
    },
    preserveEntrySignatures: false,

    treeshake: isProd,

    plugins: [
      alias({
        entries: [
          {
            // This is needed because of Babel configuration used by
            // @hypothesis/frontend-shared. It can be removed once that is fixed.
            find: 'preact/compat/jsx-dev-runtime',
            replacement: 'preact/jsx-dev-runtime',
          },
        ],
      }),
      replace({
        preventAssignment: true,
        values: {
          'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
          __VERSION__: require('./package.json').version,
        },
      }),
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**',
      }),
      nodeResolve(),
      commonjs({ include: 'node_modules/**' }),
      string({
        include: '**/*.svg',
      }),
      ...prodPlugins,
    ],
  };
}

export default [
  bundleConfig({ name: 'annotator', entry: 'src/annotator/index.js' }),
  bundleConfig({
    name: 'boot',
    entry: 'src/boot/index.js',

    // Built as an IIFE rather than ES module because there are many existing
    // <script> tags on websites that load it as a non-module script.
    format: 'iife',
  }),
  bundleConfig({ name: 'sidebar', entry: 'src/sidebar/index.js' }),
  bundleConfig({
    name: 'ui-playground',
    entry: 'dev-server/ui-playground/index.js',
  }),
];
