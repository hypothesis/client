'use strict';

var html = require('../html');
var unroll = require('../../../test/util').unroll;

var prng = require('./prng');
var randomDom = require('./random-dom');

/**
 * Return the 1-based index of `node` within its siblings of the same node type
 * and tag name.
 */
function siblingIndex(node) {
  var children = Array.from(node.parentNode.childNodes);
  var siblingIndex = 1;
  var sibling;

  for (var i=0; i < children.indexOf(node); i++) {
    sibling = children[i];
    if (sibling.nodeType === node.nodeType && sibling.tagName === node.tagName) {
      ++siblingIndex;
    }
  }

  return siblingIndex;
}

/**
 * Returns an XPath-like string representing the path from `root` to `node`.
 *
 * @param {Node} root - An ancestor of `node`
 * @param {Node} node - A descendant of `root`
 */
function pathToNode(root, node) {
  var current = node;
  var path = [];
  while (current !== root) {
    var indexStr = '[' + String(siblingIndex(current)) + ']';
    if (current.nodeType === Node.TEXT_NODE) {
      path.push('text()' + indexStr);
    } else if (current.nodeType === Node.ELEMENT_NODE) {
      path.push(current.tagName.toLowerCase() + indexStr);
    }
    current = current.parentNode;
  }
  return path.reverse().join('/');
}

function describePoint(dom, node, offset) {
  return pathToNode(dom, node) + ':' + String(offset);
}

/**
 * Return a string describing the DOM structure and Range from a given fuzz test.
 *
 * Used to generate messages when new failures are found to aid understanding
 * the error and writing new unit tests.
 */
function describeCase(dom, range) {
  return 'Input: ' + dom.innerHTML + '\nRange: ' +
    describePoint(dom, range.startContainer, range.startOffset) + ' => ' +
    describePoint(dom, range.endContainer, range.endOffset);
}

describe('HTML anchoring (fuzz tests)', function () {

  var containers;

  beforeEach(function () {
    containers = [];
  });

  afterEach(function () {
    containers.forEach(function (el) {
      el.remove();
    });
    containers = [];
  });

  // Each run picks a set of random seed values, creates a PRNG using that seed
  // and uses the PRNG to create a randomized DOM structure and a randomized
  // Range starting and ending within that DOM tree.
  //
  // If a test fails, the description will include the seed. To reproduce the
  // failure, comment out the `randomSeeds` generator below and replace with
  // `[{seed: <the seed that failed>}]`
  var randomSeeds = Array(100).fill(0).map(function () {
    return { seed: Math.round(Math.random() * 1000) };
  });

  // Patterns for error messages and stack traces from known failure cases which
  // need to be fixed, along with the seed value needed to reproduce the error.
  //
  // Caveats:
  //
  // 1) Patterns can only match function names and error messages, not source
  //    file names since these are not reported in the original stack but added
  //    later when the trace is reformatted.
  // 2) The example seed values are invalidated if the test case generation
  //    algorithm or PRNG is changed in any way. Failures should be translated
  //    into test cases in the unit tests in `html-test.js`
  //
  var knownFailures = [

    // Bugs in Text{Quote,Position}Selector describing/anchoring
    // Most of these should be fixed by https://github.com/hypothesis/client/pull/159

    // Example seed: 154
    /undefined is not an object \(evaluating 'node.nodeType'\)[^]*\bgetFirstTextNode\b/,
    // Example seed: 332
    /null is not an object \(evaluating 'node.nodeType'\)[^]*\bisText\b/,
    // Example seed: 479
    /null is not an object \(evaluating 'endNode.textContent'\)[^]*\bfromRange\b/,
    // Example seed: 29
    /null is not an object \(evaluating 'startNode.textContent'\)[^]*\bfromRange\b/,

    // Bugs in RangeSelector describing/anchoring

    // Example seed: 539
    /NotFoundError: DOM Exception 8[^]*setEnd@\[native code\]/,
    // Example seed: 121
    /null is not an object \(evaluating 'slices.shift'\)/,
    // Example seed: 649
    /Couldn't find offset [0-9]+ in element/,
    // Example seed: 33
    /null is not an object[^]*getLastTextNodeUpTo/,
    // Example seed: 355
    /null is not an object \(evaluating 'r.end.nodeValue'\)[^]*normalize/,
    // Example seed: 346
    /null is not an object \(evaluating 'nr.start.nodeValue.length'\)/,
    // Example seed: 641
    /undefined is not a constructor \(evaluating 'xpathRange.sniff\(range\).normalize\(this.root\)'\)/,
  ];

  function isKnownFailure(err) {
    var errStr = err.message + ' ' + err.stack;
    return knownFailures.some(function (pat) {
      return errStr.match(pat);
    });
  }

  unroll('describes and anchors a random range in a random DOM (seed: #seed)', function (testCase) {
    var genRandom = prng(testCase.seed);
    var dom = randomDom.generateRandomDOM(genRandom);
    document.body.appendChild(dom);
    containers.push(dom);

    var range = randomDom.randomRange(dom, genRandom);

    var selectors;
    try {
      selectors = html.describe(dom.parentNode, range, {
        fragment: false,
        ignoreErrors: false,
      });
    } catch (err) {
      if (isKnownFailure(err)) {
        return Promise.resolve();
      } else {
        console.error('Failed to describe:', describeCase(dom, range));
        throw err;
      }
    }

    var types = selectors.map(function (s) { return s.type; });
    assert.deepEqual(types, ['RangeSelector', 'TextPositionSelector', 'TextQuoteSelector']);

    var anchored = selectors.map(function (sel) {
      return html.anchor(dom.parentNode, [sel]);
    });

    return Promise.all(anchored)
      .catch(function (err) {
        if (!isKnownFailure(err)) {
          console.error('Failed to anchor:', describeCase(dom, range));
          throw err;
        }
      });
  }, randomSeeds);
});
