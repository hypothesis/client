'use strict';

const rangeUtil = require('../range-util');

function createRange(node, start, end) {
  const range = node.ownerDocument.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  return range;
}

/**
 * Round coordinates in `rect` to nearest integer values.
 */
function roundCoords(rect) {
  return {
    bottom: Math.round(rect.bottom),
    height: Math.round(rect.height),
    left: Math.round(rect.left),
    right: Math.round(rect.right),
    top: Math.round(rect.top),
    width: Math.round(rect.width),
  };
}

describe('annotator.range-util', function() {
  let selection;
  let testNode;

  beforeEach(function() {
    selection = window.getSelection();
    selection.collapse(null);

    testNode = document.createElement('span');
    testNode.innerHTML = 'Some text <br>content here';
    document.body.appendChild(testNode);
  });

  afterEach(function() {
    testNode.parentElement.removeChild(testNode);
  });

  function selectNode(node) {
    const range = testNode.ownerDocument.createRange();
    range.selectNodeContents(node);
    selection.addRange(range);
  }

  describe('#isNodeInRange', function() {
    it('is true for a node in the range', function() {
      const rng = createRange(testNode, 0, 1);
      assert.equal(rangeUtil.isNodeInRange(rng, testNode.firstChild), true);
    });

    it('is false for a node before the range', function() {
      testNode.innerHTML = 'one <b>two</b> three';
      const rng = createRange(testNode, 1, 2);
      assert.equal(rangeUtil.isNodeInRange(rng, testNode.firstChild), false);
    });

    it('is false for a node after the range', function() {
      testNode.innerHTML = 'one <b>two</b> three';
      const rng = createRange(testNode, 1, 2);
      assert.equal(
        rangeUtil.isNodeInRange(rng, testNode.childNodes.item(2)),
        false
      );
    });
  });

  describe('#getTextBoundingBoxes', function() {
    it('gets the bounding box of a range in a text node', function() {
      testNode.innerHTML = 'plain text';
      const rng = createRange(testNode.firstChild, 0, 5);
      const boxes = rangeUtil.getTextBoundingBoxes(rng);
      assert.ok(boxes.length);
    });

    it('gets the bounding box of a range containing a text node', function() {
      testNode.innerHTML = 'plain text';
      const rng = createRange(testNode, 0, 1);

      const boxes = rangeUtil.getTextBoundingBoxes(rng);

      assert.match(boxes, [
        sinon.match({
          left: sinon.match.number,
          top: sinon.match.number,
          width: sinon.match.number,
          height: sinon.match.number,
          bottom: sinon.match.number,
          right: sinon.match.number,
        }),
      ]);
    });

    it('returns the bounding box in viewport coordinates', function() {
      testNode.innerHTML = 'plain text';
      const rng = createRange(testNode, 0, 1);

      const [rect] = rangeUtil.getTextBoundingBoxes(rng);

      assert.deepEqual(
        roundCoords(rect),
        roundCoords(testNode.getBoundingClientRect())
      );
    });
  });

  describe('#selectionFocusRect', function() {
    it('returns null if the selection is empty', function() {
      assert.isNull(rangeUtil.selectionFocusRect(selection));
    });

    it('returns a point if the selection is not empty', function() {
      selectNode(testNode);
      assert.ok(rangeUtil.selectionFocusRect(selection));
    });

    it("returns the first line's rect if the selection is backwards", function() {
      selectNode(testNode);
      selection.collapseToEnd();
      selection.extend(testNode, 0);
      const rect = rangeUtil.selectionFocusRect(selection);
      assert.equal(rect.left, testNode.offsetLeft);
      assert.equal(rect.top, testNode.offsetTop);
    });

    it("returns the last line's rect if the selection is forwards", function() {
      selectNode(testNode);
      const rect = rangeUtil.selectionFocusRect(selection);
      assert.equal(rect.left, testNode.offsetLeft);
      assert.equal(
        rect.top + rect.height,
        testNode.offsetTop + testNode.offsetHeight
      );
    });
  });
});
