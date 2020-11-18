import { TextPosition, TextRange } from '../text-range';

import { assertNodesEqual } from '../../../test-util/compare-dom';

const html = `
<main>
  <article>
    <p>This is <b>a</b> <i>test paragraph</i>.</p>
    <!-- Comment in middle of HTML -->
    <pre>Some content</pre>
  </article>
</main>
`;

/**
 * Return all the `Text` descendants of `node`
 *
 * @param {Node} node
 * @return {Text[]}
 */
function textNodes(node) {
  const nodes = [];
  const iter = document.createNodeIterator(node, NodeFilter.SHOW_TEXT);
  let current;
  while ((current = iter.nextNode())) {
    nodes.push(current);
  }
  return nodes;
}

describe('annotator/anchoring/text-range', () => {
  describe('TextPosition', () => {
    let container;
    before(() => {
      container = document.createElement('div');
      container.innerHTML = html;
    });

    describe('#constructor', () => {
      it('throws if offset is negative', () => {
        assert.throws(() => {
          new TextPosition(container, -1);
        }, 'Offset is invalid');
      });
    });

    describe('#resolve', () => {
      it('resolves text position at start of element to correct node and offset', () => {
        const pos = new TextPosition(container, 0);

        const { node, offset } = pos.resolve();

        assertNodesEqual(node, textNodes(container)[0]);
        assert.equal(offset, 0);
      });

      it('resolves text position in middle of element to correct node and offset', () => {
        const pos = new TextPosition(
          container,
          container.textContent.indexOf('is a')
        );

        const { node, offset } = pos.resolve();

        assertNodesEqual(node, container.querySelector('p').firstChild);
        assert.equal(offset, 'This '.length);
      });

      it('resolves text position at end of element to correct node and offset', () => {
        const pos = new TextPosition(container, container.textContent.length);

        const { node, offset } = pos.resolve();

        const lastTextNode = textNodes(container).slice(-1)[0];
        assertNodesEqual(node, lastTextNode);
        assert.equal(offset, lastTextNode.data.length);
      });

      it('throws if offset exceeds current text content length', () => {
        const pos = new TextPosition(
          container,
          container.textContent.length + 1
        );

        assert.throws(() => {
          pos.resolve();
        }, 'Offset exceeds text length');
      });
    });

    describe('#relativeTo', () => {
      it("throws an error if argument is not an ancestor of position's element", () => {
        const el = document.createElement('div');
        el.append('One');
        const pos = TextPosition.fromPoint(el.firstChild, 0);

        assert.throws(() => {
          pos.relativeTo(document.body);
        }, 'Parent is not an ancestor of current element');
      });

      it('returns a TextPosition with offset relative to the given parent', () => {
        const grandparent = document.createElement('div');
        const parent = document.createElement('div');
        const child = document.createElement('span');

        grandparent.append('a', parent);
        parent.append('bc', child);
        child.append('def');

        const childPos = TextPosition.fromPoint(child.firstChild, 3);

        const parentPos = childPos.relativeTo(parent);
        assert.equal(parentPos.element, parent);
        assert.equal(parentPos.offset, 5);

        const grandparentPos = childPos.relativeTo(grandparent);
        assert.equal(grandparentPos.element, grandparent);
        assert.equal(grandparentPos.offset, 6);
      });
    });

    describe('fromPoint', () => {
      it('returns TextPosition for offset in Text node', () => {
        const el = document.createElement('div');
        el.append('One', 'two', 'three');

        const pos = TextPosition.fromPoint(el.childNodes[1], 0);

        assertNodesEqual(pos.element, el);
        assert.equal(pos.offset, el.textContent.indexOf('two'));
      });

      it('returns TextPosition for offset in Element node', () => {
        const el = document.createElement('div');
        el.innerHTML = '<b>foo</b><i>bar</i><u>baz</u>';

        const pos = TextPosition.fromPoint(el, 1);

        assertNodesEqual(pos.element, el);
        assert.equal(pos.offset, el.textContent.indexOf('bar'));
      });

      it('throws if node is not a Text or Element', () => {
        assert.throws(() => {
          TextPosition.fromPoint(document, 0);
        }, 'Point is not in an element or text node');
      });

      it('throws if Text node has no parent', () => {
        assert.throws(() => {
          TextPosition.fromPoint(document.createTextNode('foo'), 0);
        }, 'Text node has no parent');
      });

      it('throws if node is a Text node and offset is invalid', () => {
        const container = document.createElement('div');
        container.textContent = 'This is a test';
        assert.throws(() => {
          TextPosition.fromPoint(container.firstChild, 100);
        }, 'Text node offset is out of range');
      });

      it('throws if Node is an Element node and offset is invalid', () => {
        const container = document.createElement('div');
        const child = document.createElement('span');
        container.appendChild(child);
        assert.throws(() => {
          TextPosition.fromPoint(container, 2);
        }, 'Child node offset is out of range');
      });
    });
  });

  describe('TextRange', () => {
    describe('#toRange', () => {
      it('resolves start and end points', () => {
        const el = document.createElement('div');
        el.textContent = 'one two three';

        const textRange = new TextRange(
          new TextPosition(el, 4),
          new TextPosition(el, 7)
        );
        const range = textRange.toRange();

        assert.equal(range.toString(), 'two');
      });

      it('throws if start point cannot be resolved', () => {
        const el = document.createElement('div');
        el.textContent = 'one two three';

        const textRange = new TextRange(
          new TextPosition(el, 100),
          new TextPosition(el, 5)
        );

        assert.throws(() => {
          textRange.toRange();
        }, 'Offset exceeds text length');
      });

      it('throws if end point cannot be resolved', () => {
        const el = document.createElement('div');
        el.textContent = 'one two three';

        const textRange = new TextRange(
          new TextPosition(el, 5),
          new TextPosition(el, 100)
        );

        assert.throws(() => {
          textRange.toRange();
        }, 'Offset exceeds text length');
      });
    });

    describe('fromRange', () => {
      it('sets `start` and `end` points of range', () => {
        const el = document.createElement('div');
        el.textContent = 'one two three';

        const range = new Range();
        range.selectNodeContents(el);

        const textRange = TextRange.fromRange(range);

        assert.equal(textRange.start.element, el);
        assert.equal(textRange.start.offset, 0);
        assert.equal(textRange.end.element, el);
        assert.equal(textRange.end.offset, el.textContent.length);
      });

      it('throws if start or end points cannot be converted to a position', () => {
        const range = new Range();
        assert.throws(() => {
          TextRange.fromRange(range);
        }, 'Point is not in an element or text node');
      });
    });
  });
});
