# require-deps [![Build Status](https://travis-ci.org/bendrucker/require-deps.svg?branch=master)](https://travis-ci.org/bendrucker/require-deps)

> Generate require statements for one or more dependencies

## Install

```
$ npm install --save require-deps
```


## Usage

```js
var requireDeps = require('require-deps');

requireDeps('foo');
//=> require('foo');
requireDeps(['foo', 'bar']);
//=> require('foo');require('bar');
```

## API

#### `requireDeps(deps)` -> `string`

##### deps

*Required*  
Type: `string` / `array[string]`


## License

MIT © [Ben Drucker](http://bendrucker.me)
