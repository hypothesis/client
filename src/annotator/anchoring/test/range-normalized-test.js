import { NormalizedRange } from '../range-normalized';

describe('annotator/anchoring/range-normalized', () => {
  describe('NormalizedRange', () => {
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

    function createRange(props) {
      return new NormalizedRange({
        commonAncestor: container,
        start: container.querySelector('#p-1').firstChild,
        end: container.querySelector('#p-3').firstChild,
        ...props,
      });
    }

    describe('#limit, #text and #textNodes methods', () => {
      it('does not limit range if the limit node resides outside of bounds', () => {
        const limit = createRange().limit(container.querySelector('#span-2'));
        assert.isNull(limit);
      });

      [
        {
          bound: '#p-1',
          textNodes: ['text 1'],
        },
        {
          bound: '#p-2',
          textNodes: ['text 2'],
        },
        {
          bound: '#section-1',
          textNodes: ['text 1', 'text 2', 'text 3'],
        },
      ].forEach(test => {
        it('limits range to the bounding node', () => {
          let limit = createRange().limit(container.querySelector(test.bound));
          assert.equal(limit.text(), test.textNodes.join(''));
          // To get a node value from jquery, use ".data".
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
        const range = createRange();
        const nativeRange = range.toRange();
        assert.deepEqual(nativeRange, document.createRange());
        assert.calledWith(fakeSetStartBefore, range.start);
        assert.calledWith(fakeSetEndAfter, range.end);
      });
    });
  });
});
