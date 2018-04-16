Text Position Anchor
====================

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](http://opensource.org/licenses/MIT)
[![NPM Package](https://img.shields.io/npm/v/dom-anchor-text-position.svg)](https://www.npmjs.com/package/dom-anchor-text-position)
[![Build Status](https://travis-ci.org/tilgovi/dom-anchor-text-position.svg?branch=master)](https://travis-ci.org/tilgovi/dom-anchor-text-position)
[![codecov](https://img.shields.io/codecov/c/github/tilgovi/dom-anchor-text-position/master.svg)](https://codecov.io/gh/tilgovi/dom-anchor-text-position)

This library offers conversion between a DOM `Range` instance and a text
position selector as defined by the Web Annotation Data Model.

For more information on `Range` see
[the documentation](https://developer.mozilla.org/en-US/docs/Web/API/Range).

For more information on the text position selector see
[the specification](http://www.w3.org/TR/annotation-model/#text-position-selector).

Installation
============

To `require('dom-anchor-text-position')`:

    npm install dom-anchor-text-position

Usage
=====

## API Documentation

The module exposes only two functions.

### `fromRange(root, range)`

Provided with an existing `Range` instance this will return an object that
stores the offsets of the beginning and end of the text selected by the range as
measured from the beginning of the `root` `Node`.

### `toRange(root, selector = {start, end})`

This method returns a `Range` object that covers the interval `[start, end)` of
the text content of the `root` `Node`.

If the end is not provided, returns a collapsed range. If the start is not
provided, the default is `0`.
