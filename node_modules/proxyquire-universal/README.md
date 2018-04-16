proxyquire-universal [![Build Status](https://travis-ci.org/bendrucker/proxyquire-universal.svg?branch=master)](https://travis-ci.org/bendrucker/proxyquire-universal)
====================

Browserify plugin that allows you to replace [proxyquire](https://github.com/thlorenz/proxyquire) with [proxyquireify](https://github.com/thlorenz/proxyquireify) without code changes. If you only need to run your tests in a browser, just use [proxyquireify](https://github.com/thlorenz/proxyquireify) directly. Make sure you're not using [proxyquire features that don't have proxyquireify counterparts](#unsupported-proxyquire-features).

## Installing

```sh
$ npm install --save-dev proxyquire-universal proxyquire proxyquireify
```
proxyquire-universal sets proxyquire and proxyquireify as peer dependencies so all three packages will be siblings in your `node_modules` folder. You have full control over which versions are used.

## Usage

Write your tests for Node:

```js
var proxyquire = require('proxyquire');
proxyquire('./a', stubs);
```

Then add the `'proxyquire-universal'` plugin when you build your test bundle for the browser:

```js
browserify()
  .plugin('proxyquire-universal')
  .bundle()
  .pipe(fs.createWriteStream('test-bundle.js'));
```

proxyquire-universal takes care of calling `bundle.plugin(proxyquireify.plugin)` automatically. You should not register proxyquireify manually.

## Unsupported Proxyquire Features

proxyquireify has a very similar API to proxyquire and will be a perfect drop-in replacement for most use cases. However, there are certain proxyquire features that are not available in proxyquireify:

* [Globally overriding `require`](https://github.com/thlorenz/proxyquire#globally-override-require)
* [Disabling the `require` cache](https://github.com/thlorenz/proxyquire#forcing-proxyquire-to-reload-modules)

If you discover a case where proxyquire and proxyquireify behave differently, please [open an issue](https://github.com/bendrucker/proxyquire-universal/issues/new) with relevant code.

## License

MIT © [Ben Drucker](http://bendrucker.me)
