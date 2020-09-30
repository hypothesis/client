import { nodeFromXPath } from '../xpath';

describe('annotator/anchoring/xpath', () => {
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
