import alias from '@rollup/plugin-alias';
import { babel } from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import { string } from 'rollup-plugin-string';
import { terser } from 'rollup-plugin-terser';

const isProd = process.env.NODE_ENV === 'production';
const prodPlugins = [];
const prodAliases = [];
if (isProd) {
  prodPlugins.push(terser());

  // Exclude 'preact/debug' from production builds.
  prodAliases.push({
    find: 'preact/debug',
    replacement: 'preact',
  });
}

function bundleConfig(name, entryFile) {
  return {
    input: {
      [name]: entryFile,
    },
    output: {
      dir: 'build/scripts/',
      format: 'es',
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
          ...prodAliases,
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
      commonjs(),
      string({
        include: '**/*.svg',
      }),
      ...prodPlugins,
    ],
  };
}

export default [
  bundleConfig('annotator', 'src/annotator/index.js'),
  bundleConfig('boot', 'src/boot/index.js'),
  bundleConfig('sidebar', 'src/sidebar/index.js'),
  bundleConfig('ui-playground', 'dev-server/ui-playground/index.js'),
];
