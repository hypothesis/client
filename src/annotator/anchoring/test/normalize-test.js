import { normalize, $imports } from '../normalize';
import { BrowserRange } from '../range-browser';
import { NormalizedRange } from '../range-normalized';
import { SerializedRange } from '../range-serialized';

describe('annotator/anchoring/range-types', () => {
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
      tainted: false,
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

  describe('normalize', () => {
    describe('BrowserRange type', () => {
      it('throws an error BrowserRange instance is normalized more than once', () => {
        const browserRange = createBrowserRange();
        assert.throws(() => {
          normalize(browserRange, container);
          normalize(browserRange, container);
        }, 'You may only call normalize() once on a BrowserRange!');
      });

      it('converts BrowserRange instance to NormalizedRange instance', () => {
        const browserRange = createBrowserRange();
        const normalizedRange = normalize(browserRange, container);
        assert.isTrue(normalizedRange instanceof NormalizedRange);
        assert.deepEqual(normalizedRange, createNormalizedRange());
      });

      context('`startContainer` is ELEMENT_NODE', () => {
        it('handles ELEMENT_NODE start node', () => {
          const browserRange = createBrowserRange({
            startContainer: container.querySelector('#p-1'),
          });
          const normalizedRange = normalize(browserRange, container);
          assert.deepEqual(normalizedRange, createNormalizedRange());
        });

        it('handles ELEMENT_NODE start node when `startOffset` > than number of child nodes', () => {
          const browserRange = createBrowserRange({
            startContainer: container.querySelector('#p-1'),
            startOffset: 1,
          });
          const normalizedRange = normalize(browserRange, container);
          assert.deepEqual(normalizedRange, createNormalizedRange());
        });
      });

      context('endContainer is ELEMENT_NODE', () => {
        it('handles ELEMENT_NODE end node', () => {
          const browserRange = createBrowserRange({
            endContainer: container.querySelector('#p-3'),
          });
          const normalizedRange = normalize(browserRange, container);
          assert.deepEqual(normalizedRange, createNormalizedRange());
        });

        it('handles ELEMENT_NODE end node with no `endOffset` and no children', () => {
          const browserRange = createBrowserRange({
            endContainer: container.querySelector('#p-4'),
            endOffset: 0,
          });
          const normalizedRange = normalize(browserRange, container);
          assert.deepEqual(normalizedRange, createNormalizedRange());
        });

        it('handles ELEMENT_NODE end nodes with no `endOffset` and children', () => {
          const browserRange = createBrowserRange({
            endContainer: container.querySelector('#p-3'),
            endOffset: 0,
          });
          const normalizedRange = normalize(browserRange, container);
          assert.deepEqual(normalizedRange, createNormalizedRange());
        });

        it('handles ELEMENT_NODE end nodes with no `endOffset` and non-TEXT_NODE children', () => {
          const browserRange = createBrowserRange({
            endContainer: container.querySelector('#p-5'),
            endOffset: 0,
          });
          const normalizedRange = normalize(browserRange, container);
          assert.deepEqual(normalizedRange, createNormalizedRange());
        });
      });

      context('slices the text elements', () => {
        it('cuts the text node if there is no sibling', () => {
          const browserRange = createBrowserRange({
            startOffset: 1,
          });
          const normalizedRange = normalize(browserRange, container);
          assert.equal(normalizedRange.start.data, 'ext 1');
        });

        it('cuts the text node if there is a sibling but text node length > `startOffset`', () => {
          const browserRange = createBrowserRange({
            startContainer: container.querySelector('#p-2').firstChild,
            startOffset: 1,
          });
          const normalizedRange = normalize(browserRange, container);
          assert.equal(normalizedRange.start.data, 'ext 2a');
        });

        it('does not cut the text node', () => {
          const browserRange = createBrowserRange({
            startContainer: container.querySelector('#p-2').firstChild,
            startOffset: 7,
            endOffset: 14,
          });
          const normalizedRange = normalize(browserRange, container);
          assert.equal(normalizedRange.start.data, 'text 2b');
        });
      });

      context('the whole selection is inside one text element', () => {
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
            const normalizedRange = normalize(browserRange, container);
            assert.equal(normalizedRange.start.data, test.result);
          });
        });
      });
      context('common ancestor is not ELEMENT_NODE', () => {
        it('corrects the commons ancestor to the first non text node', () => {
          const browserRange = createBrowserRange({
            commonAncestorContainer: container.querySelector('#p-1').firstChild,
          });
          const normalizedRange = normalize(browserRange, container);
          assert.deepEqual(
            normalizedRange.commonAncestor,
            container.querySelector('#p-1')
          );
        });
      });
    });

    describe('NormalizedRange type', () => {
      it('returns an instance of itself', () => {
        const initialRange = createNormalizedRange();
        const normalizedRange = normalize(initialRange, container);
        assert.deepEqual(initialRange, normalizedRange);
      });
    });

    describe('SerializedRange type', () => {
      it('converts a SerializedRange instance to a NormalizedRange instance', () => {
        const serializedRange = createSerializedRange({
          startOffset: 0,
          endOffset: 6,
        });
        const normalizedRange = normalize(serializedRange, container);
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
        const normalizedRange = normalize(serializedRange, container);
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
            normalize(serializedRange, container);
          }, "Couldn't find offset 99 in element /section[1]/p[1]");
        });

        it("throws an error if it can't find a valid start offset", () => {
          const serializedRange = createSerializedRange({
            startOffset: 1,
            endOffset: 99,
          });
          assert.throws(() => {
            normalize(serializedRange, container);
          }, "Couldn't find offset 99 in element /section[1]/span[1]/p[1]");
        });
      });

      context('nodeFromXPath() does not return a valid node', () => {
        let fakeNodeFromXPath;

        beforeEach(() => {
          fakeNodeFromXPath = sinon.stub();
          $imports.$mock({
            './range-js': {
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
            normalize(serializedRange, container);
          }, 'Error while finding start node: /section[1]/p[1]: Error: error message');
        });

        it('throws a range error if nodeFromXPath() does not return a node', () => {
          fakeNodeFromXPath.returns(null);
          const serializedRange = createSerializedRange();
          assert.throws(() => {
            normalize(serializedRange, container);
          }, "Couldn't find start node: /section[1]/p[1]");
        });
      });
    });

    describe('invalid type', () => {
      it('throws an error when attempting to serialize an unknown range instance', () => {
        const invalidRangeObject = {};
        assert.throws(() => {
          normalize(invalidRangeObject, container);
        }, 'Could not normalize unknown range type');
      });
    });
  });
});
