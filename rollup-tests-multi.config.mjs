import { mkdirSync, readFileSync, writeFileSync } from 'fs';

import { babel } from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import { string } from 'rollup-plugin-string';
import virtual from '@rollup/plugin-virtual';
import { globSync } from 'glob';

const outputDir = 'build/scripts/test';

function bundleConfig({ name, entry, format = 'es' }) {
  return {
    input: {
      [name]: entry,
    },
    output: {
      dir: outputDir,
      chunkFileNames: `${name}-[name].bundle.js`,
      entryFileNames: '[name].bundle.js',
      format,
      sourcemap: true,
    },
    treeshake: false,
    // Suppress a warning (https://rollupjs.org/guide/en/#error-this-is-undefined)
    // due to https://github.com/babel/babel/issues/9149.
    //
    // Any code string other than "undefined" which evaluates to `undefined` will work here.
    context: 'void(0)',
    plugins: [
      // Replace some problematic dependencies which are imported but not actually
      // used with stubs. Per @rollup/plugin-virtual's docs, this must be listed
      // first.
      virtual({
        // Enzyme dependency used in its "Static Rendering" mode, which we don't use.
        'cheerio/lib/utils': '',
        cheerio: '',

        // Node modules that are not available in the browser.
        crypto: '',
        util: '',
      }),
      replace({
        preventAssignment: true,
        values: {
          'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
          __VERSION__: JSON.parse(readFileSync('./package.json').toString())
            .version,
        },
      }),
      nodeResolve({
        browser: true,
        extensions: ['.js', '.ts', '.tsx'],

        // Disallow use of browser polyfills for Node builtin modules. We're
        // trying to avoid dependencies which rely on these.
        //
        // There are a couple of references to Node builtins that are stubbed by
        // configuration for the `virtual` plugin above.
        preferBuiltins: false,
      }),
      commonjs({
        include: 'node_modules/**',
      }),
      string({
        include: '**/*.{html,svg}',
      }),
      json(),

      // The Babel transform generates additional code for code coverage.
      // Place it last to minimize amount of code parsed by subsequent plugins.
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**',
        extensions: ['.js', '.ts', '.tsx'],
        presets: [
          [
            '@babel/preset-react',
            {
              // Turn off the `development` setting in tests to prevent warnings
              // about `this`. See https://github.com/babel/babel/issues/9149.
              development: false,
              runtime: 'automatic',
              importSource: 'preact',
            },
          ],
        ],
        plugins: [
          'mockable-imports',
          [
            'babel-plugin-istanbul',
            {
              exclude: ['**/test/**/*.js', '**/test-util/**'],
            },
          ],
        ],
      }),
    ],
  }
}

mkdirSync(outputDir, { recursive: true });

// Create one test bundle per test file
const testFiles = globSync('src/**/*-test.js').sort().map(path => {
  const [extensionLessPath] = path.split('.');
  return {
    path,
    slug: extensionLessPath.replaceAll('/', '-'),
  };
});
for (const { path, slug } of testFiles) {
  writeFileSync(`${outputDir}/${slug}-test-input.js`, [
    `import "../../../src/sidebar/test/bootstrap.js";`,
    `import "../../../${path}";`
  ].join('\n'));
}

export default testFiles.map(({ path, slug }) => bundleConfig({
  name: slug,
  entry: path,
}));
