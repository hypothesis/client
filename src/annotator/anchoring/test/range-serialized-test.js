import { SerializedRange } from '../range-serialized';

describe('annotator/anchoring/range-serialized', () => {
  describe('SerializedRange', () => {
    let container;
    const html = `
        <section id="section-1">
          <p id="p-1">text 1</p>
          <p id="p-2">text 2</p>
          <span id="span-1">
            <p id="p-3">text 3</p>
          </span>
        </section>
        <span id="span-2"></span>`;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      // Remove extraneous white space which can affect textNodes in tests.
      // 1. two or more spaces in a row
      // 2. new lines
      container.innerHTML = html.replace(/[\s+]{2,}|\n+/g, '');
    });

    afterEach(() => {
      container.remove();
    });

    function createRange() {
      return new SerializedRange({
        start: container.querySelector('#p-1').firstChild,
        startOffset: 0,
        end: container.querySelector('#p-3').firstChild,
        endOffset: 0,
      });
    }

    describe('#constructor', () => {
      it('creates a SerializedRange instance', () => {
        const range = createRange();
        assert.deepEqual(range, {
          start: container.querySelector('#p-1').firstChild,
          startOffset: 0,
          end: container.querySelector('#p-3').firstChild,
          endOffset: 0,
        });
      });
    });

    describe('#toObject', () => {
      it('returns an object literal', () => {
        const range = createRange();
        assert.deepEqual(range.toObject(), {
          start: container.querySelector('#p-1').firstChild,
          startOffset: 0,
          end: container.querySelector('#p-3').firstChild,
          endOffset: 0,
        });
      });
    });
  });
});
