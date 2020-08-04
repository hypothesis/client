'use strict';

const { Transform } = require('stream');

const terser = require('terser');

/**
 * Return a Node `Transform` stream that minifies JavaScript input.
 *
 * This is designed to be used both to process individual modules as a Browserify
 * transform, and also to be applied to the output of the whole bundle to
 * compress the module infrastructure that Browserify adds.
 *
 * @example
 *   browserify(['src/app.js'])
 *     .transform({ global: true }, minifyStream) // Minify individual modules
 *     .pipe(minifyStream()) // Minify the code added by Browserify
 *     .pipe(output);
 */
function minifyStream() {
  return new Transform({
    transform(data, encoding, callback) {
      if (!this.chunks) {
        this.chunks = [];
      }
      this.chunks.push(data);
      callback();
    },

    async flush(callback) {
      const code = Buffer.concat(this.chunks).toString();
      const minifyResult = await terser.minify(code, {
        // See https://github.com/terser/terser#minify-options-structure
        sourceMap: {
          content: 'inline',
          url: 'inline',
        },
      });

      this.push(minifyResult.code);
      callback();
    },
  });
}

module.exports = minifyStream;
