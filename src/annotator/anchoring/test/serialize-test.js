import { serialize, $imports } from '../serialize';
import { BrowserRange } from '../range-browser';
import { NormalizedRange } from '../range-normalized';
import { SerializedRange } from '../range-serialized';

describe('annotator/anchoring/serialize', () => {
  let container;
  const html = `
      <section id="section-1">
        <p id="p-1">text 1</p>
        <p id="p-2">text 2a<br>text 2b</p>
        <span id="span-1">
          <p id="p-3">text 3</p>
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
      endOffset: 6,
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

  describe('serialize', () => {
    describe('BrowserRange type', () => {
      let fakeNormalize;

      beforeEach(() => {
        fakeNormalize = sinon.stub();
        $imports.$mock({
          './normalize': {
            normalize: fakeNormalize,
          },
        });
      });

      afterEach(() => {
        $imports.$restore();
      });

      it('converts BrowserRange to SerializedRange instance', () => {
        const browserRange = createBrowserRange();
        const normalizedRange = createNormalizedRange();
        fakeNormalize
          .withArgs(browserRange, container)
          .returns(normalizedRange); // mock the normalized return value
        const result = serialize(browserRange, container);
        assert.isTrue(result instanceof SerializedRange);
        assert.equal(result.end, '/section[1]/span[1]/p[1]');
      });

      it('converts BrowserRange to SerializedRange instance with `ignoreSelector` condition', () => {
        const browserRange = createBrowserRange();
        const normalizedRange = createNormalizedRange();
        // Mock the normalized return value
        fakeNormalize
          .withArgs(browserRange, container)
          .returns(normalizedRange);
        const result = serialize(browserRange, container, '#p-3');
        // End xpath shall ignore the provided selector.
        assert.equal(result.end, '/section[1]/span[1]');
      });
    });

    describe('NormalizedRange type', () => {
      let fakeSerializedRange;

      beforeEach(() => {
        fakeSerializedRange = sinon.stub();
        $imports.$mock({
          './range-serialized': {
            SerializedRange: fakeSerializedRange,
          },
        });
      });

      afterEach(() => {
        $imports.$restore();
      });

      it('serialize the range with relative parent', () => {
        serialize(createNormalizedRange(), container);
        assert.calledWith(fakeSerializedRange, {
          start: '/section[1]/p[1]',
          end: '/section[1]/span[1]/p[1]',
          startOffset: 0,
          endOffset: 6,
        });
      });

      it('serialize the range with no relative parent', () => {
        serialize(createNormalizedRange());
        assert.calledWith(fakeSerializedRange, {
          start: '/html[1]/body[1]/div[1]/section[1]/p[1]',
          end: '/html[1]/body[1]/div[1]/section[1]/span[1]/p[1]',
          startOffset: 0,
          endOffset: 6,
        });
      });

      it('serialize the range with `ignoreSelector` condition', () => {
        serialize(createNormalizedRange(), container, '#p-3');
        assert.calledWith(fakeSerializedRange, {
          start: '/section[1]/p[1]',
          end: '/section[1]/span[1]',
          startOffset: 0,
          endOffset: 6,
        });
      });

      it('serialize the range with multiple text nodes', () => {
        serialize(
          createNormalizedRange({
            start: container.querySelector('#p-2').firstChild.nextSibling
              .nextSibling,
            end: container.querySelector('#p-3').firstChild,
            startOffset: 7,
            endOffset: 6,
          })
        );
        assert.calledWith(fakeSerializedRange, {
          start: '/html[1]/body[1]/div[1]/section[1]/p[2]',
          end: '/html[1]/body[1]/div[1]/section[1]/span[1]/p[1]',
          startOffset: 7,
          endOffset: 6,
        });
      });
    });

    describe('SerializedRange type', () => {
      let fakeNormalize;

      beforeEach(() => {
        fakeNormalize = sinon.stub();
        $imports.$mock({
          './normalize': {
            normalize: fakeNormalize,
          },
        });
      });

      afterEach(() => {
        $imports.$restore();
      });

      it('converts a SerializedRange to a new SerializedRange instance', () => {
        const serializedRange = createSerializedRange();
        const normalizedRange = createNormalizedRange();
        // mock the normalized return value
        fakeNormalize
          .withArgs(serializedRange, container)
          .returns(normalizedRange);
        const result = serialize(serializedRange, container);
        assert.isTrue(result instanceof SerializedRange);
        // the copied instance shall be identical to the initial
        assert.deepEqual(result, serializedRange);
      });

      it('converts a SerializedRange to a new SerializedRange instance with `ignoreSelector` condition', () => {
        const serializedRange = createSerializedRange();
        const normalizedRange = createNormalizedRange();
        // mock the normalized return value
        fakeNormalize
          .withArgs(serializedRange, container)
          .returns(normalizedRange);
        const result = serialize(serializedRange, container, '#p-3');
        // end xpath shall ignore the provided selector and not
        // be identical to the initial end xpath
        assert.notEqual(serializedRange.end, result.end);
        assert.equal(result.end, '/section[1]/span[1]');
      });
    });

    describe('invalid type', () => {
      it('throws an error when attempting to serialize an unknown range instance', () => {
        const invalidRangeObject = {};
        assert.throws(() => {
          serialize(invalidRangeObject, container);
        }, 'Could not serialize unknown range type');
      });
    });
  });
});
