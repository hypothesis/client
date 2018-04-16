# browserify-ngannotate

[![Build Status](https://travis-ci.org/omsmith/browserify-ngannotate.svg)](https://travis-ci.org/omsmith/browserify-ngannotate) [![Coverage Status](http://img.shields.io/coveralls/omsmith/browserify-ngannotate.svg)](https://coveralls.io/r/omsmith/browserify-ngannotate)

A [browserify](http://github.com/substack/node-browserify) transform that uses [ng-annotate](https://github.com/olov/ng-annotate) to add dependency injection annotations to your AngularJS source code, preparing it for minification.

# Usage
```
browserify -t browserify-ngannotate app.js > bundle.js
```

## Options
Provided options are passed through to ng-annotate. The `add` option defaults
to `true`.

For example, to remove annotations, one could use the following:

```
browserify -t [ browserify-ngannotate --no-add --remove ] app.js > bundle.js
```

### Source maps
Sourcemapping will be enabled automatically when browserify is in `debug` mode:

```bash
browserify --debug -t browserify-ngannotate app.js > bundle.js
```

### File extensions
Define the filetypes to transform. Prevents other resouces like .json or .css from being processed, if you are including them with require().

This is done using the `--x` or `--ext` transform options:

```
browserify -t [ browserify-ngannotate --x .coffee ] app.js > bundle.js
```

The above example will only annotate .js and .coffee files, ignoring the rest.

# Install
```
npm install browserify-ngannotate --save
```

# License
MIT
