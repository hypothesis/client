'use strict';
var htmlMinifier  = require('html-minifier'),
    fs            = require('fs'),
    path          = require('path'),
    tools         = require('browserify-transform-tools');

var MINIFY_TRANSFORM_OPTIONS = {
  includeExtensions: [
    '.html',
    '.htm',
    '.tmpl',
    '.tpl',
    '.hbs'
  ]
};

var TRANSFORM_OPTIONS = {
  includeExtensions: MINIFY_TRANSFORM_OPTIONS.includeExtensions.concat([
    '.text',
    '.txt'
  ])
};

var DEFAULT_MINIFY_OPTIONS = {
  removeComments: true,
  removeCommentsFromCDATA: true,
  removeCDATASectionsFromCDATA: true,
  collapseWhitespace: true,
  conservativeCollapse: false,
  preserveLineBreaks: false,
  collapseBooleanAttributes: false,
  removeAttributeQuotes: true,
  removeRedundantAttributes: false,
  useShortDoctype: false,
  removeEmptyAttributes: false,
  removeScriptTypeAttributes: false,
  removeStyleLinkTypeAttributes: false,
  removeOptionalTags: false,
  removeIgnored: false,
  removeEmptyElements: false,
  lint: false,
  keepClosingSlash: false,
  caseSensitive: false,
  minifyJS: false,
  minifyCSS: false,
  minifyURLs: false
};

var NODE_REQUIRE_OPTIONS = {};

/**
 * Stringifies the content
 * @param   {string}    content
 * @returns {string}
 */
function stringify (content) {
  return 'module.exports = ' + JSON.stringify(content) + ';\n';
}

/**
 * Takes a set of user-supplied options, and ensure file configuration
 * settings is in the correct form for 'browserify-transform-tools'.
 * @param   {object | array}    options
 * @returns {object}
 */
function getTransformOptions (options) {
  if (!options) {
    return {};
  }

  if (Object.prototype.toString.call(options) === '[object Array]') {
    options = { appliesTo: { includeExtensions: options }  };
  }

  if (options.extensions && !options.appliesTo) {
    var extensions = options.extensions._ || options.extensions;
    options.appliesTo = { includeExtensions: extensions };
    delete options.extensions;
  }

  return options;
}

/**
 * Takes a set of user-supplied options, and determines which set of file-
 * extensions to run Stringify on.
 * @param   {object | array}    options
 * @param   {object}            options.extensions
 * @returns {string[]}
 */
function getRequireExtensions (options) {
  var extensions = TRANSFORM_OPTIONS.includeExtensions;

  if (options && options.appliesTo && options.appliesTo.includeExtensions) {
    extensions = options.appliesTo.includeExtensions;
  }

  // Lowercase all file extensions for case-insensitive matching.
  extensions = extensions.map(function (ext) {
    return ext.toLowerCase();
  });

  return extensions;
}

/**
 * Provides user or default options for html-minifier module
 * @param   {object}    options
 * @returns {object}
 */
function getMinifyOptions (options) {
  if (!options || !options.minify) {
    return { requested: false };
  }

  var minifierOpts = options.minifier,
      minify = { requested: true, options: DEFAULT_MINIFY_OPTIONS };

  if (options.minifyAppliesTo) {
    minify.config = { appliesTo: options.minifyAppliesTo };
  } else if (minifierOpts && minifierOpts.extensions) {
    var extensions = minifierOpts.extensions._ || options.minifier.extensions;
    minify.config = { appliesTo: { includeExtensions: extensions } };
  }

  if (options.minifyOptions) {
    minify.options = options.minifyOptions;
  } else if (minifierOpts && minifierOpts.options) {
    minify.options = minifierOpts.options;
  }

  return minify;
}

/**
 * Returns minified contents if requested
 * @param   {string} filename
 * @param   {string} contents
 * @param   {object} options
 * @return  {string}
 */
function minify(filename, contents, options) {
  var minifier = getMinifyOptions(options);

  if (minifier.requested) {
    if (!tools.skipFile(filename, minifier.config, MINIFY_TRANSFORM_OPTIONS)) {
      return htmlMinifier.minify(contents, minifier.options);
    }
  }

  return contents;
}

/**
 * Reads in a file and stringifies and minifies the contents.
 * @param  {string} module
 * @param  {string} filename
 * @return {string}
 */
function requireStringify (module, filename) {
  var contents;

  try {
    contents = fs.readFileSync(path.resolve(filename), 'utf8');
  } catch (error) {
    throw new Error('Stringify could not find module \'' + path.resolve(filename) + '\'.');
  }

  module.exports = minify(filename, contents, NODE_REQUIRE_OPTIONS);
}

/**
 * Registers the given extensions with node require.
 * @param  {object | array} options
 * @return {void}
 */
function registerWithRequire (options) {
  NODE_REQUIRE_OPTIONS = getTransformOptions(options);

  var exts = getRequireExtensions(NODE_REQUIRE_OPTIONS);

  for (var i = 0; i < exts.length; i++) {
    require.extensions[ exts[i] ] = requireStringify;
  }
}

/**
 * Function which is called to do the transform.
 *
 * - `contents` are the contents of the file.
 * - `transformOptions.file` is the name of the file (as would be
 *   passed to a normal browserify transform.)
 * - `transformOptions.config` is the configuration data that has been
 *   automatically loaded.  For details, see the transform configuration documentation
 *   (https://github.com/benbria/browserify-transform-tools/wiki/Transform-Configuration).
 * - `transformOptions.config` is a copy of
 * - `done(err, transformed)` is a callback which must be called, passing a
 *   string with the transformed contents of the file.
 *
 * @param  {string} content
 * @param  {object} transformOptions
 * @param  {function} done
 * @returns {void}
 */
function transformFn (contents, transformOptions, done) {
  var file = transformOptions.file,
      options = transformOptions.config;

  done(null, stringify(minify(file, contents, options)));
}

/**
 * Exposes the Browserify transform function.
 *
 * This handles two use cases:
 * - Factory: given no arguments or options as first argument it returns
 *   the transform function
 * - Standard: given file (and optionally options) as arguments a stream is
 *   returned. This follows the standard pattern for browserify transformers.
 *
 * @param   {string}            file
 * @param   {object | array}    options
 * @returns {stream | function} depending on if first argument is string.
 */
module.exports = function (file, options) {
  var transform = tools.makeStringTransform('stringify', TRANSFORM_OPTIONS, transformFn);

  if (typeof file !== 'string') {
    // Factory: return a function.
    // Set options variable here so it is ready for when browserifyTransform
    // is called. Note: first argument is the options.
    var capturedOptions = getTransformOptions(file);
    return function (file) { return transform(file, capturedOptions); };
  } else {
    return transform(file, getTransformOptions(options));
  }
};

// exports registerWithRequire so stringify can be registered with node require.
module.exports.registerWithRequire = registerWithRequire;

// Test-environment specific exports...
if (process.env.NODE_ENV) {
  module.exports.NODE_REQUIRE_OPTIONS        = NODE_REQUIRE_OPTIONS;
  module.exports.requireStringify            = requireStringify;
  module.exports.stringify                   = stringify;
  module.exports.getRequireExtensions        = getRequireExtensions;
  module.exports.getTransformOptions         = getTransformOptions;
  module.exports.TRANSFORM_OPTIONS           = TRANSFORM_OPTIONS;
  module.exports.minify                      = minify;
  module.exports.getMinifyOptions            = getMinifyOptions;
  module.exports.MINIFY_TRANSFORM_OPTIONS    = MINIFY_TRANSFORM_OPTIONS;
  module.exports.DEFAULT_MINIFY_OPTIONS      = DEFAULT_MINIFY_OPTIONS;
}
