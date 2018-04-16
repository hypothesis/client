# pff [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url]
> Minimal printf implementation

__No more words, show me the numbers!__

![image](https://cloud.githubusercontent.com/assets/365089/3465905/427d6f24-0274-11e4-9348-216df8f05060.png)

Run yourself to get numbers relevant to your hardware:

```bash
$ npm i -g matcha printf sprint
$ npm i
$ matcha benchmark/index.js
```

## Usage

```js
var pff = require('pff');

console.log(pff('%s world from %d year!', 'Hello', 2014.7));
// Hello world from 2014 year!
```

## Specifiers

| Specifier     | What it does          | Example                     | Result           |
| ------------: | --------------------- | --------------------------- | ---------------- |
| **%s**        | String                | `pff('Hello %s', 'world')`  | `'Hello world'`  |
| **%d**        | Floored number        | `pff('My age is %d', 13.2)` | `'My age is 13'` |
| **%%**        | Percent               | `pff('100%%s cool!')`       | `'100%s cool!'`  |

Not much, but hey! - it's fast!

# License

MIT (c) 2014 Vsevolod Strukchinsky (floatdrop@gmail.com)

[npm-url]: https://npmjs.org/package/pff
[npm-image]: http://img.shields.io/npm/v/pff.svg

[travis-url]: https://travis-ci.org/floatdrop/pff
[travis-image]: http://img.shields.io/travis/floatdrop/pff.svg
