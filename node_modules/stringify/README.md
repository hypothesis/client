# Stringify #

_**NOTE:** I no longer actively maintain this package. I'd love to get PRs to keep it going though!_

[![NPM](https://nodei.co/npm/stringify.png?downloads&downloadRank)](https://nodei.co/npm/stringify/)
[![Build Status][travis-image]][travis-url]

Browserify plugin to require() text files (such as HTML templates) inside of
your client-side JavaScript files.

*NOTE:* Has not been tested on Node below version 4.0.0, and has been tested up
to Node 8.1.3. Please report (or put a Pull Request up for) any bugs you may
find.

## Installation ##

```bash
npm install stringify
```

## Usage ##

### Browserify ###

#### Browserify Command Line ####

```bash
browserify -t [ stringify --extensions [.html .hbs] ] myfile.js
```

#### Browserify Middleware ####

```javascript
var browserify = require('browserify'),
    stringify = require('stringify');

var bundle = browserify()
    .transform(stringify, {
      appliesTo: { includeExtensions: ['.hjs', '.html', '.whatever'] }
    })
    .add('my_app_main.js');

app.use(bundle);
```

__NOTE__: You MUST call this as I have above. The Browserify .transform() method
HAS to plug this middleware in to Browserify BEFORE you add the entry point
(your main client-side file) for Browserify.

Now, in your clientside files you can use require() as you would for JSON and
JavaScript files, but include text files that have just been parsed into a
JavaScript string:

```javascript
var my_text = require('../path/to/my/text/file.txt');

console.log(my_text);
```


#### Gulp and Browserify ####

To incorporate stringify into a `gulp` build process using `browserify`,
register `stringify` as a transform as follows:

```javascript
var browserify = require('browserify'),
    source = require('vinyl-source-stream'),
    stringify = require('stringify');

gulp.task('js', function() {
  return browserify({ 'entries': ['src/main.js'], 'debug' : env !== 'dev' })
    .transform(stringify, {
        appliesTo: { includeExtensions: ['.html'] },
        minify: true
    })
    .bundle()
    .pipe(source('main.js')) // gives streaming vinyl file object
    .pipe(gulp.dest(paths.build));
});
```

### NodeJS ###

Allows you to "stringify" your non-JS files using the NodeJS module system.
Please only use Stringify this way in NodeJS (Read: Not the browser/Browserify!)

```javascript
var stringify = require('stringify');

stringify.registerWithRequire({
  appliesTo: { includeExtensions: ['.txt', '.html'] },
  minify: true,
  minifyAppliesTo: {
    includeExtensions: ['.html']
  },
  minifyOptions: {
    // html-minifier options
  }
});

var myTextFile = require('./path/to/my/text/file.txt');

console.log(myTextFile); // prints the contents of file.
```

For NodeJS, the __appliesTo__ configuration option only supports the
__includeExtensions__ option - see _Including / Excluding Files_ section for
further details.

## Configuration ##

### Loading Configuration from package.json ###

When package.json is found, configuration is loaded by finding a key in the package.json with the name __"stringify"__ as your transform.

```javascript
{
    "name": "myProject",
    "version": "1.0.0",
    ...
    "stringify": {
        "appliesTo": { "includeExtensions": [".html"] },
        "minify": true
    }
}
```

Or alternatively you can set the __"stringify"__ key to be a <kbd>.js</kbd> or
<kbd>.json</kbd> file:

```javascript
{
    "name": "myProject",
    "version": "1.0.0",
    ...
    "stringify": "stringifyConfig.js"
}
```

And then configuration will be loaded from that file:

```javascript
module.exports = {
    "appliesTo": { "includeExtensions": [".html"] },
    "minify": true
};
```

For more details about package.json configuration, see the Browserify Transform
Tools
[configuration documentation](https://github.com/benbria/browserify-transform-tools/wiki/Transform-Configuration#loading-configuration-from-packagejson).


### Including / Excluding Files ###

The configuration option __appliesTo__ is used to configure which files should
be included or excluded.  The default included extensions are:

```javascript
['.html', '.htm', '.tmpl', '.tpl', '.hbs', '.text', '.txt']
```

The __appliesTo__ should include exactly one of the following:

| Option                        | Description                   |
| ----------------------------- | ----------------------------- |
| <kbd>.includeExtensions</kbd> | If this option is specified, then any file with an extension not in this list will skipped.  |
| <kbd>.excludeExtensions</kbd> | A list of extensions which will be skipped.  |
| <kbd>.files</kbd>             | A list of paths, relative to the configuration file, of files which should be transformed.  Only these files will be transformed. |
| <kbd>.regex</kbd>             | A regex or a list of regexes.  If any regex matches the full path of the file, then the file will be processed, otherwise not.  |

For more details about the __appliesTo__ configuration property, see the
Browserify Transform Tools
[configuration documentation](https://github.com/benbria/browserify-transform-tools/wiki/Transform-Configuration#common-configuration).


### Minification ###

By default, files will not get minified - setting __minify__ configuration
option to true will enable this.

The __minifyAppliesTo__ configuration option allows files to be included or
excluded from the minifier in a similar way to __appliesTo__ (see _Including
/ Excluding Files_ section for more details).

The default included file extensions are:

```javascript
['.html', '.htm', '.tmpl', '.tpl', '.hbs']
```
The options set in the __minifyOptions__ configuration option are passed
through to html-minifier (for more informations or to override those options,
please go to [html-minifier github](https://github.com/kangax/html-minifier)).

The default value of __minifyOptions__ is:

```javascript
{
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
}
```
If you require an HTML file and you want to minify the requested string, you can
configure Stringify to do it:

```javascript
stringify({
  appliesTo: { includeExtensions: ['.txt', '.html'] },
  minify: true,
  minifyAppliesTo: {
    includeExtensions: ['.html']
  },
  minifyOptions: {
    // html-minifier options
  }
})
```

## Realistic Example/Use-Case ##

The reason I created this was to get string versions of my Handlebars templates
required in to my client-side JavaScript. You can theoretically use this for any
templating parser though.

Here is how that is done:

application.js:
```javascript
var browserify = require('browserify'),
    stringify = require('stringify');

var bundle = browserify()
    .transform(stringify, {
      appliesTo: { includeExtensions: ['.hbs', '.handlebars'] }
    })
    .addEntry('my_app_main.js');

app.use(bundle);
```

my_app_main.js:
```javascript
var Handlebars = require('handlebars'),
    template = require('my/template/path.hbs'),
    data = {
      "json_data": "This is my string!"
    };

var hbs_template = Handlebars.compile(template);

// Now I can use hbs_template like I would anywhere else, passing it data and getting constructed HTML back.
var constructed_template = hbs_template(data);

/*
  Now 'constructed_template' is ready to be appended to the DOM in the page!
  The result of it should be:

  <p>This is my string!</p>
*/
```

my/template/path.hbs:
```html
<p>{{ json_data }}</p>
```


## Contributing ##

If you would like to contribute code, please do the following:

1. Fork this repository and make your changes.
2. Write tests for any new functionality. If you are fixing a bug that tests did not cover, please make a test that reproduces the bug.
3. Add your name to the "contributors" section in the `package.json` file.
4. Squash all of your commits into a single commit via `git rebase -i`.
5. Run the tests by running `npm install && make test` from the source directory.
6. Assuming those pass, send the Pull Request off to me for review!

Please do not iterate the package.json version number – I will do that myself
when I publish it to NPM.

### Style-Guide ###

Please follow this simple style-guide for all code contributions:

* Indent using spaces.
* camelCase all callables.
* Use semi-colons.
* Place a space after a conditional or function name, and its conditions/arguments. `function (...) {...}`

[travis-url]: https://travis-ci.org/JohnPostlethwait/stringify
[travis-image]: https://img.shields.io/travis/JohnPostlethwait/stringify.svg
