import {
  sniff,
  BrowserRange,
  NormalizedRange,
  SerializedRange,
  $imports,
} from '../range';

describe('annotator/anchoring/range', () => {
  let container;
  const html = `
      <section id="section-1">
        <p id="p-1">text 1</p>
        <p id="p-2">text 2a<br/>text 2b</p>
        <span id="span-1">
          <p id="p-3">text 3</p>
          <p id="p-4"></p>
          <p id="p-5"><br/></p>
        </span>
      </section>
      <span id="span-2"></span>`;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    // Remove extraneous white space which can affect offsets in tests.
    // 1. Two or more spaces in a row
    // 2. New lines
    container.innerHTML = html.replace(/[\s+]{2,}|\n+/g, '');
  });

  afterEach(() => {
    container.remove();
  });

  function createBrowserRange(props) {
    return new BrowserRange({
      commonAncestorContainer: container,
      startContainer: container.querySelector('#p-1').firstChild,
      startOffset: 0,
      endContainer: container.querySelector('#p-3').firstChild,
      endOffset: 1,
      ...props,
    });
  }

  function createNormalizedRange(props) {
    return new NormalizedRange({
      commonAncestor: container,
      start: container.querySelector('#p-1').firstChild,
      end: container.querySelector('#p-3').firstChild,
      ...props,
    });
  }

  function createSerializedRange(props) {
    return new SerializedRange({
      start: '/section[1]/p[1]',
      startOffset: 0,
      end: '/section[1]/span[1]/p[1]',
      endOffset: 6,
      ...props,
    });
  }

  describe('sniff', () => {
    it('returns a BrowserRange', () => {
      const result = sniff({
        commonAncestorContainer: container,
        startContainer: container.querySelector('#p-1').firstChild,
        startOffset: 0,
        endContainer: container.querySelector('#p-3').firstChild,
        endOffset: 1,
      });
      assert.isTrue(result instanceof BrowserRange);
    });

    it('returns a SerializedRange', () => {
      const result = sniff({
        start: '/section[1]/p[1]',
        startOffset: 0,
        end: '/section[1]/span[1]/p[1]',
        endOffset: 6,
      });
      assert.isTrue(result instanceof SerializedRange);
    });

    it('returns a NormalizedRange', () => {
      const result = sniff({
        commonAncestor: container,
        start: container.querySelector('#p-1').firstChild,
        end: container.querySelector('#p-3').firstChild,
      });
      assert.isTrue(result instanceof NormalizedRange);
    });

    it("throws an error if it can't detect a range type", () => {
      assert.throws(() => {
        sniff({
          fake: true,
        });
      }, 'Could not sniff range type');
    });
  });

  describe('BrowserRange', () => {
    describe('#constructor', () => {
      it('creates a BrowserRange instance', () => {
        const range = createBrowserRange();
        assert.deepEqual(range, {
          commonAncestorContainer: container,
          startContainer: container.querySelector('#p-1').firstChild,
          startOffset: 0,
          endContainer: container.querySelector('#p-3').firstChild,
          endOffset: 1,
          tainted: false,
        });
      });
    });

    describe('#normalize', () => {
      it('throws an error if BrowserRange instance is normalized more than once', () => {
        const browserRange = createBrowserRange();
        assert.throws(() => {
          browserRange.normalize();
          browserRange.normalize();
        }, 'You may only call normalize() once on a BrowserRange!');
      });

      it('converts BrowserRange instance to NormalizedRange instance', () => {
        const browserRange = createBrowserRange();
        const normalizedRange = browserRange.normalize();
        assert.isTrue(normalizedRange instanceof NormalizedRange);
        assert.deepEqual(normalizedRange, createNormalizedRange());
      });

      context('`startContainer` is ELEMENT_NODE', () => {
        it('handles ELEMENT_NODE start node', () => {
          const browserRange = createBrowserRange({
            startContainer: container.querySelector('#p-1'),
          });
          const normalizedRange = browserRange.normalize();
          assert.deepEqual(normalizedRange, createNormalizedRange());
        });

        it('handles ELEMENT_NODE start node when `startOffset` > than number of child nodes', () => {
          const browserRange = createBrowserRange({
            startContainer: container.querySelector('#p-1'),
            startOffset: 1,
          });
          const normalizedRange = browserRange.normalize();
          assert.deepEqual(normalizedRange, createNormalizedRange());
        });
      });

      context('endContainer is ELEMENT_NODE', () => {
        it('handles ELEMENT_NODE end node', () => {
          const browserRange = createBrowserRange({
            endContainer: container.querySelector('#p-3'),
          });
          const normalizedRange = browserRange.normalize();
          assert.deepEqual(normalizedRange, createNormalizedRange());
        });

        it('handles ELEMENT_NODE end node with no `endOffset` and no children', () => {
          const browserRange = createBrowserRange({
            endContainer: container.querySelector('#p-4'),
            endOffset: 0,
          });
          const normalizedRange = browserRange.normalize();
          assert.deepEqual(normalizedRange, createNormalizedRange());
        });

        it('handles ELEMENT_NODE end nodes with no `endOffset` and children', () => {
          const browserRange = createBrowserRange({
            endContainer: container.querySelector('#p-3'),
            endOffset: 0,
          });
          const normalizedRange = browserRange.normalize();
          assert.deepEqual(normalizedRange, createNormalizedRange());
        });

        it('handles ELEMENT_NODE end nodes with no `endOffset` and non-TEXT_NODE children', () => {
          const browserRange = createBrowserRange({
            endContainer: container.querySelector('#p-5'),
            endOffset: 0,
          });
          const normalizedRange = browserRange.normalize();
          assert.deepEqual(normalizedRange, createNormalizedRange());
        });
      });

      context('slices the text elements', () => {
        it('cuts the text node if there is a next sibling', () => {
          const browserRange = createBrowserRange({
            startOffset: 1,
          });
          const normalizedRange = browserRange.normalize();
          assert.equal(normalizedRange.start.data, 'ext 1');
        });

        it('cuts the text node if node length > `startOffset`', () => {
          const browserRange = createBrowserRange({
            startContainer: container.querySelector('#p-2').firstChild,
            startOffset: 1,
          });
          const normalizedRange = browserRange.normalize();
          assert.equal(normalizedRange.start.data, 'ext 2a');
        });

        it('does not cut the text node when there is no next sibling and node length < `startOffset`', () => {
          const browserRange = createBrowserRange({
            startContainer: container.querySelector('#p-2').firstChild,
            startOffset: 7,
            endOffset: 14,
          });
          const normalizedRange = browserRange.normalize();
          assert.equal(normalizedRange.start.data, 'text 2b');
        });
      });

      context('the whole selection is inside one text node', () => {
        [
          {
            startOffset: 1,
            endOffset: 3,
            result: 'ex',
          },
          {
            startOffset: 0,
            endOffset: 7,
            result: 'text 1',
          },
        ].forEach(test => {
          it('crops the text node appropriately', () => {
            const browserRange = createBrowserRange({
              startContainer: container.querySelector('#p-1').firstChild,
              endContainer: container.querySelector('#p-1').firstChild,
              startOffset: test.startOffset,
              endOffset: test.endOffset,
            });
            const normalizedRange = browserRange.normalize();
            assert.equal(normalizedRange.start.data, test.result);
          });
        });
      });

      context('common ancestor is not ELEMENT_NODE', () => {
        it('corrects the common ancestor to the first non-text ancestor', () => {
          const browserRange = createBrowserRange({
            commonAncestorContainer: container.querySelector('#p-1').firstChild,
          });
          const normalizedRange = browserRange.normalize();
          assert.deepEqual(
            normalizedRange.commonAncestor,
            container.querySelector('#p-1')
          );
        });
      });
    });

    describe('#serialize', () => {
      it('converts BrowserRange to SerializedRange instance', () => {
        const browserRange = createBrowserRange();
        const result = browserRange.serialize(container);
        assert.isTrue(result instanceof SerializedRange);
        assert.deepEqual(result, {
          start: '/section[1]/p[1]',
          startOffset: 0,
          end: '/section[1]/span[1]/p[1]',
          endOffset: 1,
        });
      });
    });
  });

  describe('NormalizedRange', () => {
    describe('#limit, #text and #textNodes methods', () => {
      it('does not limit range if the limit node resides outside of bounds', () => {
        const limit = createNormalizedRange().limit(
          container.querySelector('#span-2')
        );
        assert.isNull(limit);
      });

      [
        {
          bound: '#p-1',
          textNodes: ['text 1'],
        },
        {
          bound: '#p-2',
          textNodes: ['text 2a', 'text 2b'],
        },
        {
          bound: '#section-1',
          textNodes: ['text 1', 'text 2a', 'text 2b', 'text 3'],
        },
      ].forEach(test => {
        it('limits range to the bounding node', () => {
          const limit = createNormalizedRange().limit(
            container.querySelector(test.bound)
          );
          assert.equal(limit.text(), test.textNodes.join(''));
          assert.deepEqual(
            test.textNodes,
            limit.textNodes().map(n => n.data)
          );
        });
      });
    });

    describe('#toRange', () => {
      let fakeSetStartBefore;
      let fakeSetEndAfter;

      beforeEach(() => {
        sinon.stub(document, 'createRange');
        fakeSetStartBefore = sinon.stub();
        fakeSetEndAfter = sinon.stub();
        document.createRange.returns({
          setStartBefore: fakeSetStartBefore,
          setEndAfter: fakeSetEndAfter,
        });
      });

      afterEach(() => {
        document.createRange.restore();
      });

      it('converts normalized range to native range', () => {
        const range = createNormalizedRange();
        const nativeRange = range.toRange();
        assert.deepEqual(nativeRange, document.createRange());
        assert.calledWith(fakeSetStartBefore, range.start);
        assert.calledWith(fakeSetEndAfter, range.end);
      });
    });

    describe('#normalize', () => {
      it('returns itself', () => {
        const initialRange = createNormalizedRange();
        const normalizedRange = initialRange.normalize();
        assert.equal(initialRange, normalizedRange);
      });
    });

    describe('#serialize', () => {
      it('serialize the range with relative parent', () => {
        const serializedRange = createNormalizedRange().serialize(container);
        assert.deepEqual(serializedRange, {
          start: '/section[1]/p[1]',
          end: '/section[1]/span[1]/p[1]',
          startOffset: 0,
          endOffset: 6,
        });
      });

      it('serialize the range with no relative parent', () => {
        const serializedRange = createNormalizedRange().serialize();
        assert.deepEqual(serializedRange, {
          start: '/html[1]/body[1]/div[1]/section[1]/p[1]',
          end: '/html[1]/body[1]/div[1]/section[1]/span[1]/p[1]',
          startOffset: 0,
          endOffset: 6,
        });
      });

      it('serialize the range with multiple text nodes', () => {
        const serializedRange = createNormalizedRange({
          start: container.querySelector('#p-2').firstChild.nextSibling
            .nextSibling,
          end: container.querySelector('#p-3').firstChild,
          startOffset: 7,
          endOffset: 6,
        }).serialize();
        assert.deepEqual(serializedRange, {
          start: '/html[1]/body[1]/div[1]/section[1]/p[2]',
          end: '/html[1]/body[1]/div[1]/section[1]/span[1]/p[1]',
          startOffset: 7,
          endOffset: 6,
        });
      });
    });
  });

  describe('SerializedRange', () => {
    describe('#constructor', () => {
      it('creates a SerializedRange instance', () => {
        const range = createSerializedRange();
        assert.deepEqual(range, {
          start: '/section[1]/p[1]',
          startOffset: 0,
          end: '/section[1]/span[1]/p[1]',
          endOffset: 6,
        });
      });
    });

    describe('#toObject', () => {
      it('returns an object literal', () => {
        const range = createSerializedRange();
        assert.deepEqual(range.toObject(), {
          start: '/section[1]/p[1]',
          startOffset: 0,
          end: '/section[1]/span[1]/p[1]',
          endOffset: 6,
        });
      });
    });

    describe('#normalize', () => {
      it('converts a SerializedRange instance to a NormalizedRange instance', () => {
        const serializedRange = createSerializedRange();
        const normalizedRange = serializedRange.normalize(container);
        assert.isTrue(normalizedRange instanceof NormalizedRange);
        assert.equal(normalizedRange.start.data, 'text 1');
        assert.equal(normalizedRange.end.data, 'text 3');
      });

      it('adjusts starting offset to second text node', () => {
        const serializedRange = createSerializedRange({
          start: '/section[1]/p[2]',
          end: '/section[1]/p[2]',
          startOffset: 7,
          endOffset: 14,
        });
        const normalizedRange = serializedRange.normalize(container);
        assert.isTrue(normalizedRange instanceof NormalizedRange);
        assert.equal(normalizedRange.start.data, 'text 2b');
        assert.equal(normalizedRange.end.data, 'text 2b');
      });

      context('when offsets are invalid', () => {
        it("throws an error if it can't find a valid start offset", () => {
          const serializedRange = createSerializedRange({
            startOffset: 99,
          });
          assert.throws(() => {
            serializedRange.normalize(container);
          }, "Couldn't find offset 99 in element /section[1]/p[1]");
        });

        it("throws an error if it can't find a valid end offset", () => {
          const serializedRange = createSerializedRange({
            startOffset: 1,
            endOffset: 99,
          });
          assert.throws(() => {
            serializedRange.normalize(container);
          }, "Couldn't find offset 99 in element /section[1]/span[1]/p[1]");
        });
      });

      context('nodeFromXPath() does not return a valid node', () => {
        let fakeNodeFromXPath;

        beforeEach(() => {
          fakeNodeFromXPath = sinon.stub();
          $imports.$mock({
            './xpath': {
              nodeFromXPath: fakeNodeFromXPath,
            },
          });
        });

        afterEach(() => {
          $imports.$restore();
        });

        it('throws a range error if nodeFromXPath() throws an error', () => {
          fakeNodeFromXPath.throws(new Error('error message'));
          const serializedRange = createSerializedRange();
          assert.throws(() => {
            serializedRange.normalize(container);
          }, 'Error while finding start node: /section[1]/p[1]: Error: error message');
        });
      });
    });

    describe('#serialize', () => {
      it('converts a SerializedRange to a new SerializedRange instance', () => {
        const serializedRange = createSerializedRange();
        const result = serializedRange.serialize(container);
        assert.isTrue(result instanceof SerializedRange);
        // The copied instance shall be identical to the initial.
        assert.deepEqual(result, serializedRange);
      });
    });
  });
});
