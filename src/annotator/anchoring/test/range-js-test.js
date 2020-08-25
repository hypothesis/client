import $ from 'jquery';

import { xpathFromNode, nodeFromXPath, $imports } from '../range-js';

describe('annotator/anchoring/range-js', () => {
  describe('xpathFromNode', () => {
    let container;
    let fakeSimpleXPathJQuery;
    let fakeSimpleXPathPure;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      fakeSimpleXPathJQuery = sinon.stub().returns('/div[1]');
      fakeSimpleXPathPure = sinon.stub().returns('/div[1]');

      $imports.$mock({
        './xpath-util': {
          simpleXPathJQuery: fakeSimpleXPathJQuery,
          simpleXPathPure: fakeSimpleXPathPure,
        },
      });
    });

    afterEach(() => {
      container.remove();
    });

    it('calls `simpleXPathJQuery`', () => {
      const xpath = xpathFromNode($(container), document.body);
      assert.called(fakeSimpleXPathJQuery);
      assert.equal(xpath, '/div[1]');
    });

    it('calls `simpleXPathPure` if `simpleXPathJQuery` throws an exception', () => {
      sinon.stub(console, 'log');
      fakeSimpleXPathJQuery.throws(new Error());
      const xpath = xpathFromNode($(container), document.body);
      assert.called(fakeSimpleXPathPure);
      assert.equal(xpath, '/div[1]');
      assert.isTrue(
        // eslint-disable-next-line no-console
        console.log.calledWith(
          'jQuery-based XPath construction failed! Falling back to manual.'
        )
      );
      // eslint-disable-next-line no-console
      console.log.restore();
    });
  });

  describe('nodeFromXPath', () => {
    let container;
    let fakeFindChild;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      fakeFindChild = sinon.stub().returns(document.body);

      $imports.$mock({
        './xpath-util': {
          findChild: fakeFindChild,
        },
      });
    });

    afterEach(() => {
      container.remove();
    });

    it('returns the last node returned from `findChild`', () => {
      const span = document.createElement('span');
      container.appendChild(span);
      fakeFindChild.onFirstCall().returns(container);
      fakeFindChild.onSecondCall().returns(span);
      assert.equal(nodeFromXPath('/div[1]/span[1]', document.body), span);
    });

    [
      {
        xpath: '/div[1]',
        params: [
          {
            name: 'div',
            idx: 1,
          },
        ],
      },
      {
        xpath: '/div[1]/span[3]/p[1]',
        params: [
          {
            name: 'div',
            idx: 1,
          },
          {
            name: 'span',
            idx: 3,
          },
          {
            name: 'p',
            idx: 1,
          },
        ],
      },
      {
        xpath: '/DIV[2]/TEXT()[3]/SPAN[1]',
        params: [
          {
            name: 'div',
            idx: 2,
          },
          {
            name: 'text()',
            idx: 3,
          },
          {
            name: 'span',
            idx: 1,
          },
        ],
      },
    ].forEach(test => {
      it('calls `findChild` with the following node names and indices', () => {
        nodeFromXPath(test.xpath, document.body);
        test.params.forEach(call => {
          assert.calledWith(fakeFindChild, document.body, call.name, call.idx);
        });
      });
    });
  });
});
