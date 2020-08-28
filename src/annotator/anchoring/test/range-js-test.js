import $ from 'jquery';

import { nodeFromXPath, xpathFromNode, $imports } from '../range-js';

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
      $imports.$restore();
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
    const html = `
        <h1 id="h1-1">text</h1>
        <p id="p-1">text<br/><br/><a id="a-1">text</a></p>
        <p id="p-2">text<br/><em id="em-1"><br/>text</em>text</p>
        <span>
          <ul>
            <li id="li-1">text 1</li>
            <li id="li-2">text 2</li>
            <li id="li-3">text 3</li>
          </ul>
        </span>`;

    beforeEach(() => {
      container = document.createElement('div');
      container.innerHTML = html;
      document.body.appendChild(container);
    });

    afterEach(() => {
      container.remove();
    });

    [
      {
        xpath: '/h1[1]',
        nodeName: 'H1',
      },
      {
        xpath: '/p[1]/a[1]/text()[1]',
        nodeName: '#text',
      },
      {
        xpath: '/span[1]/ul[1]/li[2]',
        nodeName: 'LI',
      },
      {
        xpath: '/SPAN[1]/UL[1]/LI[2]',
        nodeName: 'LI',
      },
      {
        xpath: '/SPAN[1]/UL[1]/LI[2]/text()',
        nodeName: '#text',
      },
    ].forEach(test => {
      it('it returns the node associated with the XPath', () => {
        const result = nodeFromXPath(test.xpath, container);
        assert.equal(result.nodeName, test.nodeName);
      });

      it('it returns the node associated with the XPath when `document.evaluate` throws an error', () => {
        const result = nodeFromXPath(test.xpath, container);
        sinon.stub(document, 'evaluate').throws(new Error());
        const resultFallback = nodeFromXPath(test.xpath, container);
        assert.equal(result, resultFallback);
        document.evaluate.restore();
      });
    });
  });
});
