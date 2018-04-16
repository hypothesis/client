# karma-browserify

[![Build Status](https://travis-ci.org/nikku/karma-browserify.svg?branch=master)](https://travis-ci.org/nikku/karma-browserify)

[karma-browserify](https://github.com/nikku/karma-browserify) is a fast [Browserify](http://browserify.org) integration for [Karma](https://karma-runner.github.io) that handles large projects with ease.


## Installation

Get the plug-in via [npm](https://www.npmjs.org/).

You will also need to install [browserify](https://www.npmjs.com/package/browserify) and [watchify](https://www.npmjs.com/package/watchify) (for auto-watch only) with it.

```
npm install --save-dev karma-browserify browserify watchify
```


## Usage

Add `browserify` as a framework to your Karma configuration file. For each file that should be processed and bundled by Karma, configure the `browserify` preprocessor. Optionally use the `browserify` config entry to configure how the bundle gets created.


```javascript
module.exports = function(karma) {
  karma.set({

    frameworks: [ 'browserify', 'jasmine', 'or', 'any', 'other', 'framework' ],
    files: ['test/**/*.js'],
    preprocessors: {
      'test/**/*.js': [ 'browserify' ]
    },

    browserify: {
      debug: true,
      transform: [ 'brfs' ]
    }
  });
}
```

Look at the [example directory](https://github.com/nikku/karma-browserify/tree/master/example) for a simple [browserify](http://browserify.org) + [jasmine](http://jasmine.github.io) project that uses this plug-in.


### Browserify Config

Test bundles can be configured through the `browserify` Karma configuration property. [Configuration options](https://github.com/substack/node-browserify#var-b--browserifyfiles-or-opts) are passed directly to browserify.

For example to generate source maps for easier debugging, specify:

```javascript
    browserify: {
      debug: true
    }
```

There are three properties that are not passed directly:

* [transform](#transforms)
* [plugin](#plugins)
* [configure](#additional-bundle-configuration)
* bundleDelay


#### Transforms

If you use CoffeeScript, JSX or other tools that need to transform the source file before bundling, specify a [browserify transform](https://github.com/substack/node-browserify#btransformtr-opts) (Karma preprocessors are [not supported](https://github.com/nikku/karma-browserify/issues/36)).

```javascript
    browserify: {
      transform: [ 'reactify', 'coffeeify', 'brfs' ]

      // don't forget to register the extensions
      extensions: ['.js', '.jsx', '.coffee']
    }
```

You can also specify options for the transformations:

```javascript
    browserify: {
      transform: [ ['reactify', {'es6': true}], 'coffeeify', 'brfs' ]
    }
```

#### Plugins

The [browserify plugin](https://github.com/substack/node-browserify#bpluginplugin-opts) option supports the same syntax as `transform`.

```javascript
    browserify: {
      plugin: [ 'stringify' ]
    }
```

#### Additional Bundle Configuration

You may perform additional configuration in a function passed as the `configure` option and that receives the browserify instance as an argument. A custom `prebundle` event is emitted on the bundle right before a bundling operation takes place. This is useful when setting up things like [externals](https://github.com/substack/node-browserify#external-requires):

```javascript
    browserify: {
      configure: function(bundle) {
        bundle.on('prebundle', function() {
          bundle.external('foobar');
        });
      }
    }
```

You'll also need to use the `'prebundle'` event for full control over the order of transforms and plugins:

```javascript
    browserify: {
      configure: function(bundle) {
        bundle.once('prebundle', function() {
          bundle.transform('babelify').plugin('proxyquireify/plugin');
        });
      }
    }
```

Note that transforms must only be added once.


### Watchify Config

You can configure the underlying [watchify](https://github.com/substack/watchify) instance via `config.watchify`. This is helpful if you need to fine tune the change detection used during `autoWatch=true`.

```javascript
    watchify: {
      poll: true
    }
```


## How it Works

This project is a preprocessor for Karma that combines test files and dependencies into a browserified bundle. It relies on [watchify](https://github.com/substack/watchify) to generate the bundle and to keep it updated during `autoWatch=true`.

Before the initial test run we build one browserify bundle for all test cases and dependencies. Once any of the files change, it incrementally updates the bundle. Each file included in Karma is required from the file bundle via a stub. Thereby it ensures tests are only executed once per test run.


## Detailed Configuration

The following code snippet shows a Karma configuration file with all browserify-related options.

```javascript
module.exports = function(karma) {
  karma.set({

    // include browserify first in used frameworks
    frameworks: [ 'browserify', 'jasmine' ],

    // add all your files here,
    // including non-commonJS files you need to load before your test cases
    files: [
      'some-non-cjs-library.js',
      'test/**/*.js'
    ],

    // add preprocessor to the files that should be
    // processed via browserify
    preprocessors: {
      'test/**/*.js': [ 'browserify' ]
    },

    // see what is going on
    logLevel: 'LOG_DEBUG',

    // use autoWatch=true for quick and easy test re-execution once files change
    autoWatch: true,

    // add additional browserify configuration properties here
    // such as transform and/or debug=true to generate source maps
    browserify: {
      debug: true,
      transform: [ 'brfs' ],
      configure: function(bundle) {
        bundle.on('prebundle', function() {
          bundle.external('foobar');
        });
      }
    }
  });
};
```


## Related

Credit goes to to the original [karma-browserify](https://github.com/xdissent/karma-browserify) and [karma-browserifast](https://github.com/cjohansen/karma-browserifast). This library builds on the lessons learned in these projects and offers improved configurability, speed and/or the ability to handle large projects.



## Maintainers

* [Ben Drucker](https://github.com/bendrucker)
* [Nico Rehwaldt](https://github.com/nikku)


## License

MIT
