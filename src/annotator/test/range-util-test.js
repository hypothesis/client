import * as rangeUtil from '../range-util';
import { isSelectionBackwards, selectedRange } from '../range-util';

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

describe('annotator/range-util', () => {
  let selection;
  let testNode;

  beforeEach(() => {
    selection = window.getSelection();
    selection.collapse(null);

    testNode = document.createElement('span');
    testNode.innerHTML = 'Some text <br>content here';
    document.body.appendChild(testNode);
  });

  afterEach(() => {
    testNode.remove();
  });

  function selectNode(node) {
    const range = testNode.ownerDocument.createRange();
    range.selectNodeContents(node);
    selection.addRange(range);
  }

  describe('isNodeInRange', () => {
    it('returns true for a node in the range', () => {
      const range = createRange(testNode, 0, 1);
      assert.isTrue(rangeUtil.isNodeInRange(range, testNode.firstChild));
    });

    it('returns false for a node before the range', () => {
      testNode.innerHTML = 'one <b>two</b> three';
      const range = createRange(testNode, 1, 2);
      assert.isFalse(rangeUtil.isNodeInRange(range, testNode.firstChild));
    });

    it('returns false for a node after the range', () => {
      testNode.innerHTML = 'one <b>two</b> three';
      const range = createRange(testNode, 1, 2);
      assert.isFalse(
        rangeUtil.isNodeInRange(range, testNode.childNodes.item(2)),
      );
    });

    it('can test a node with no parent', () => {
      const node = document.createElement('span');
      const range = new Range();
      range.setStart(node, 0);
      range.setEnd(node, 0);
      assert.isTrue(rangeUtil.isNodeInRange(range, node));
    });

    it('can test a node against an empty range', () => {
      const node = document.createElement('span');
      const range = new Range();
      assert.isFalse(rangeUtil.isNodeInRange(range, node));
    });

    it('returns false when range and node do not share a common ancestor', () => {
      const range = document.createRange();
      range.selectNodeContents(document.body);
      const otherDoc = document.implementation.createHTMLDocument('');
      const nodeInOtherDoc = otherDoc.body.appendChild(
        otherDoc.createElement('span'),
      );
      assert.isFalse(rangeUtil.isNodeInRange(range, nodeInOtherDoc));
    });
  });

  describe('getTextBoundingBoxes', () => {
    it('gets the bounding box of a range in a text node', () => {
      testNode.innerHTML = 'plain text';
      const rng = createRange(testNode.firstChild, 0, 5);
      const boxes = rangeUtil.getTextBoundingBoxes(rng);
      assert.ok(boxes.length);
    });

    it('gets the bounding box of a range containing a text node', () => {
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

    it('returns the bounding box in viewport coordinates', () => {
      testNode.innerHTML = 'plain text';
      const rng = createRange(testNode, 0, 1);

      const [rect] = rangeUtil.getTextBoundingBoxes(rng);

      assert.deepEqual(
        roundCoords(rect),
        roundCoords(testNode.getBoundingClientRect()),
      );
    });

    it('returns empty array for text node when sub-range is collapsed', () => {
      testNode.innerHTML = 'ab';
      const textNode = testNode.firstChild;
      const rng = testNode.ownerDocument.createRange();
      rng.setStart(textNode, 1);
      rng.setEnd(textNode, 1);
      const boxes = rangeUtil.getTextBoundingBoxes(rng);
      assert.deepEqual(boxes, []);
    });
  });

  describe('selectionFocusRect', () => {
    it('returns null if the selection is empty', () => {
      assert.isNull(rangeUtil.selectionFocusRect(selection));
    });

    it('returns a point if the selection is not empty', () => {
      selectNode(testNode);
      assert.ok(rangeUtil.selectionFocusRect(selection));
    });

    it("returns the first line's rect if the selection is backwards", () => {
      selectNode(testNode);
      selection.collapseToEnd();
      selection.extend(testNode, 0);
      const rect = rangeUtil.selectionFocusRect(selection);
      assert.approximately(rect.left, testNode.offsetLeft, 1);
      assert.approximately(rect.top, testNode.offsetTop, 1);
    });

    it("returns the last line's rect if the selection is forwards", () => {
      selectNode(testNode);
      const rect = rangeUtil.selectionFocusRect(selection);
      assert.approximately(rect.left, testNode.offsetLeft, 1);
      assert.approximately(
        rect.top + rect.height,
        testNode.offsetTop + testNode.offsetHeight,
        1,
      );
    });

    it('returns null when range has only whitespace (no bounding boxes)', () => {
      testNode.innerHTML = '   ';
      testNode.appendChild(document.createTextNode('  '));
      const range = testNode.ownerDocument.createRange();
      range.setStart(testNode.firstChild, 0);
      range.setEnd(testNode.lastChild, 2);
      selection.removeAllRanges();
      selection.addRange(range);
      assert.isNull(rangeUtil.selectionFocusRect(selection));
    });
  });

  describe('selectedRange', () => {
    it('returns `null` when selection argument is null', () => {
      assert.isNull(selectedRange(null));
    });

    it('returns `null` if selection has no ranges', () => {
      window.getSelection().empty();
      assert.isNull(selectedRange());
    });

    it('returns `null` if selected range is collapsed', () => {
      const range = new Range();
      range.setStart(document.body, 0);
      range.setEnd(document.body, 0);

      window.getSelection().addRange(range);

      assert.isNull(selectedRange());
    });

    it('returns first range in selection if not collapsed', () => {
      const range = new Range();
      range.selectNodeContents(document.body);

      window.getSelection().addRange(range);

      assert.instanceOf(selectedRange(), Range);
    });

    // Test handling of a Firefox-specific issue where selection may contain
    // multiple ranges. In spec-compliant browsers (eg. Chrome), the selection
    // only contains zero or one range.
    it('returns union of all ranges in selection if there are multiple', () => {
      const parent = document.createElement('div');
      const el1 = document.createElement('div');
      el1.textContent = 'foo';
      const el2 = document.createElement('div');
      el2.textContent = 'bar';
      const el3 = document.createElement('div');
      el3.textContent = 'baz';
      parent.append(el1, el2, el3);

      const ranges = [new Range(), new Range(), new Range()];
      ranges[0].selectNodeContents(el1);
      ranges[1].selectNodeContents(el2);
      ranges[2].selectNodeContents(el3);

      const fakeSelection = {
        rangeCount: 3,
        getRangeAt: index => ranges[index],
      };

      let range = selectedRange(fakeSelection);
      assert.equal(range.toString(), 'foobarbaz');

      // Test with the ordering of ranges reversed. The merged range should
      // be the same.
      ranges.reverse();

      range = selectedRange(fakeSelection);
      assert.equal(range.toString(), 'foobarbaz');
    });

    it('unions two ranges correctly when first range starts after second', () => {
      const parent = document.createElement('div');
      const el1 = document.createElement('span');
      el1.textContent = 'a';
      const el2 = document.createElement('span');
      el2.textContent = 'b';
      parent.append(el1, el2);
      document.body.appendChild(parent);

      const rangeFirst = new Range();
      rangeFirst.setStart(el2, 0);
      rangeFirst.setEnd(el2, 1);
      const rangeSecond = new Range();
      rangeSecond.setStart(el1, 0);
      rangeSecond.setEnd(el1, 1);

      const fakeSelection = {
        rangeCount: 2,
        getRangeAt: i => (i === 0 ? rangeFirst : rangeSecond),
      };

      const range = selectedRange(fakeSelection);
      assert.equal(range.startContainer, el1);
      assert.equal(range.endContainer, el2);
      assert.equal(range.toString(), 'ab');
      parent.remove();
    });

    it('unions two ranges correctly when first range starts before second', () => {
      const parent = document.createElement('div');
      const el1 = document.createElement('span');
      el1.textContent = 'a';
      const el2 = document.createElement('span');
      el2.textContent = 'b';
      parent.append(el1, el2);
      document.body.appendChild(parent);

      const rangeFirst = new Range();
      rangeFirst.setStart(el1, 0);
      rangeFirst.setEnd(el1, 1);
      const rangeSecond = new Range();
      rangeSecond.setStart(el2, 0);
      rangeSecond.setEnd(el2, 1);

      const fakeSelection = {
        rangeCount: 2,
        getRangeAt: i => (i === 0 ? rangeFirst : rangeSecond),
      };

      const range = selectedRange(fakeSelection);
      assert.equal(range.startContainer, el1);
      assert.equal(range.endContainer, el2);
      assert.equal(range.toString(), 'ab');
      parent.remove();
    });
  });

  describe('isSelectionBackwards', () => {
    let container;

    beforeEach(() => {
      container = document.createElement('div');
      container.append('first', 'second');
      document.body.append(container);
    });

    afterEach(() => {
      container.remove();
    });

    [
      { nodeA: 0, offsetA: 5, nodeB: 0, offsetB: 2, backwards: true },
      { nodeA: 0, offsetA: 2, nodeB: 0, offsetB: 5, backwards: false },
      { nodeA: 1, offsetA: 0, nodeB: 0, offsetB: 0, backwards: true },
      { nodeA: 0, offsetA: 0, nodeB: 1, offsetB: 0, backwards: false },
    ].forEach(({ nodeA, offsetA, nodeB, offsetB, backwards }) => {
      it('returns true if focus is before anchor', () => {
        getSelection().setBaseAndExtent(
          container.childNodes[nodeA],
          offsetA,
          container.childNodes[nodeB],
          offsetB,
        );
        assert.equal(isSelectionBackwards(getSelection()), backwards);
      });
    });

    it('returns false when focusNode differs from anchorNode and startContainer is not focusNode', () => {
      // Create a forward selection where focusNode !== anchorNode
      // This tests the branch: range.startContainer === selection.focusNode (should be false for forward selection)
      // container already has 'first' and 'second' as text nodes from beforeEach
      const selection = getSelection();
      selection.removeAllRanges();
      
      // Create a forward selection: anchor at first node (index 0), focus at second node (index 1)
      // The range created will start at first node, so startContainer will be first node
      // focusNode will be second node
      // So startContainer !== focusNode, should return false
      selection.setBaseAndExtent(container.childNodes[0], 0, container.childNodes[1], 0);
      
      // Verify setup: focusNode !== anchorNode
      assert.notEqual(selection.focusNode, selection.anchorNode);
      assert.equal(selection.anchorNode, container.childNodes[0]);
      assert.equal(selection.focusNode, container.childNodes[1]);
      
      // For forward selection, range.startContainer (first node) !== focusNode (second node)
      // So isSelectionBackwards should return false
      assert.isFalse(isSelectionBackwards(selection));
    });
  });

  describe('itemsForRange', () => {
    it('returns unique items for range', () => {
      const range = document.createRange();
      range.setStart(testNode, 0);
      range.setEnd(testNode, testNode.childNodes.length);

      const data = new Map();
      data.set(testNode, 'itemA');
      data.set(testNode.childNodes[0], 'itemB');
      data.set(testNode.childNodes[1], 'itemB'); // Intentional duplicate.
      data.set(testNode.childNodes[2], 'itemC');
      const items = rangeUtil.itemsForRange(range, item => data.get(item));

      assert.deepEqual(items, ['itemA', 'itemB', 'itemC']);
    });
  });
});
