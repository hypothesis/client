NodeIterator
============

`NodeIterator` is an interface originally specified by
[DOM Level 2](http://www.w3.org/TR/DOM-Level-2-Traversal-Range/traversal.html#Iterator-overview).
While it is a useful tool for seeking within the nodes of the DOM, it has
[some warts](http://ejohn.org/blog/unimpressed-by-nodeiterator/) and its
implementation is inconsistent across browsers.

Among the problems with `NodeIterator` are that it specifies arguments that
really should be optional, but are required on some browsers. Several browsers
expose two additional properties not in the original specification but later
added to the DOM living standard, `referenceNode` and
`pointerBeforeReferenceNode`.

This module attempts to modernize `NodeIterator` for use in all major browsers.
It does this through the following modifications:

- The `whatToShow` and `filter` arguments are optional.

- The `referenceNode` and `pointerBeforeReferenceNode` properties are shimmed
  when they aren't available.

Compatibility Note
==================

In browsers that implement an older specification or do not implement the
specification at all, behavior in the presence of concurrent DOM mutation is
undefined.

Installation
============

Using npm:

    npm install dom-node-iterator

Usage
=====

This package implements the [es-shim API](https://github.com/es-shims/api)
interface. It works in an ES3-supported environment and complies with the
[spec](http://www.ecma-international.org/ecma-262/6.0/).

```js
// Install support, polluting the global namespace.
require('dom-node-iterator/shim')();
var iter = document.createNodeIterator(document.body);

// Get the best implementation, without polluting the global namespace.
var createNodeIterator = require('dom-node-iterator/polyfill')();
var iter = createNodeIterator.call(document, document.body);

// Get the pure JavaScript implementation.
var createNodeIterator = require('dom-node-iterator/implementation');
var iter = createNodeIterator.call(document, document.body);
```

See [the documentation at the Mozilla Developer Network](https://developer.mozilla.org/en-US/docs/Web/API/NodeIterator)
for more information about using `NodeIterator`.
