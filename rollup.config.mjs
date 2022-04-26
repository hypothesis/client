import { readFileSync } from 'fs';

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
  // Minify output.
  prodPlugins.push(
    terser({
      format: {
        // Strip *all* comments from minified output. This works around an issue
        // with column numbers in stack traces in Safari. See
        // https://bugs.webkit.org/show_bug.cgi?id=221548 and
        // https://github.com/hypothesis/client/issues/4045.
        comments: false,

        // Limit length of lines in output. This makes the minfied output easier
        // to examine in tools that struggle with long lines and limits the
        // impact of an issue with stack trace column numbers in Firefox.
        // See https://github.com/hypothesis/client/issues/4045.
        max_line_len: 1024,
      },
    })
  );

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
      chunkFileNames: `${name}-[name].bundle.js`,
      entryFileNames: '[name].bundle.js',
      format,
      sourcemap: true,

      // Rewrite source paths from "../../src/path/to/module.js" to
      // "app:///src/path/to/module.js". Converting the paths to absolute URLs
      // prevents Sentry from resolving them against the sourcemap URL, which
      // in turn keeps module URLs consistent across releases. This helps issue
      // grouping. See https://gist.github.com/robertknight/cbdee9db50601c5244d9e483930c32ca.
      //
      // The "app:" scheme is one of several URI schemes (others being "https:"
      // and "webpack:") that Sentry feeds through the module URL => module path
      // cleaning process.
      sourcemapPathTransform: sourcePath => {
        const url = new URL(`app:///${sourcePath}`);
        return url.toString();
      },
    },
    preserveEntrySignatures: false,

    treeshake: isProd,

    // Suppress a warning (https://rollupjs.org/guide/en/#error-this-is-undefined)
    // due to https://github.com/babel/babel/issues/9149.
    //
    // Any code string other than "undefined" which evaluates to `undefined` will work here.
    context: 'void(0)',

    plugins: [
      replace({
        preventAssignment: true,
        values: {
          'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
          __VERSION__: JSON.parse(readFileSync('./package.json').toString())
            .version,
        },
      }),
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**',
        extensions: ['.js', '.ts', '.tsx'],
      }),
      nodeResolve({ extensions: ['.js', '.ts', '.tsx'] }),
      commonjs({ include: 'node_modules/**' }),
      string({
        include: '**/*.svg',
      }),
      ...prodPlugins,
    ],
  };
}

export default [
  bundleConfig({
    name: 'annotator',
    entry: 'src/annotator/index.js',

    // The annotator bundle is created as a non-module script because module
    // scripts are not supported in Safari in XHTML documents.
    // See https://github.com/hypothesis/client/issues/4350#issuecomment-1079101754.
    //
    // Non-module scripts also re-evaluate if they are added to the page multiple
    // times, which is important if the client is unloaded and then re-loaded
    // into a page, although that is possible to work around with a module script
    // by changing the URL fragment each time.
    format: 'iife',
  }),
  bundleConfig({ name: 'sidebar', entry: 'src/sidebar/index.js' }),
  bundleConfig({
    name: 'ui-playground',
    entry: 'dev-server/ui-playground/index.js',
  }),
];
