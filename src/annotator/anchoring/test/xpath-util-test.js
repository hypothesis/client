import {
  getTextNodes,
  getLastTextNodeUpTo,
  getFirstTextNodeNotBefore,
  xpathFromNode,
} from '../xpath-util';

describe('annotator/anchoring/xpath-util', () => {
  describe('getTextNodes', () => {
    let container;

    const nodeValues = nodes => nodes.map(n => n.nodeValue);

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      container.remove();
    });

    it('finds basic text nodes', () => {
      container.innerHTML = `<span>text 1</span><span>text 2</span>`;
      const result = getTextNodes(container);
      assert.deepEqual(nodeValues(result), ['text 1', 'text 2']);
    });

    it('finds basic text nodes and whitespace', () => {
      container.innerHTML = `<span>text 1</span>
        <span>text 2</span>`;
      const result = getTextNodes(container);
      assert.deepEqual(nodeValues(result), ['text 1', '\n        ', 'text 2']);
    });

    it('finds basic text nodes and whitespace but ignores comments', () => {
      container.innerHTML = `<span>text 1</span>
        <!--span>text 2</span-->`;
      const result = getTextNodes(container);
      assert.deepEqual(nodeValues(result), ['text 1', '\n        ']);
    });
  });

  describe('getLastTextNodeUpTo', () => {
    let container;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      container.remove();
    });

    it('gets the last text node', () => {
      container.innerHTML = `<span>text</span>`;
      const result = getLastTextNodeUpTo(container);
      assert.equal(result.nodeValue, 'text');
    });

    it('gets the last text node (with siblings)', () => {
      container.innerHTML = `<span>text first</span><span>text last</span>`;
      const result = getLastTextNodeUpTo(container);
      assert.equal(result.nodeValue, 'text last');
    });

    it('looks backwards to get the last text node if none are found', () => {
      container.innerHTML = `<span>text first</span><span>text last</span><div id="too-far"></div>`;
      const result = getLastTextNodeUpTo(container.querySelector('#too-far'));
      assert.equal(result.nodeValue, 'text last');
    });

    it('returns null if no text node exists', () => {
      const span = document.createElement('span');
      container.appendChild(span);
      assert.equal(getLastTextNodeUpTo(span), null);
    });
  });

  describe('getFirstTextNodeNotBefore', () => {
    let container;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      container.remove();
    });

    it('gets the first text node', () => {
      container.innerHTML = `<span>text</span>`;
      const result = getFirstTextNodeNotBefore(container);
      assert.equal(result.nodeValue, 'text');
    });

    it('gets the first text node (with siblings)', () => {
      container.innerHTML = `<span>text first</span><span>text last</span>`;
      const result = getFirstTextNodeNotBefore(container);
      assert.equal(result.nodeValue, 'text first');
    });

    it('looks forward to get the first text node if none are found', () => {
      container.innerHTML = `<div id="too-far"></div><span>text first</span><span>text last</span>`;
      const result = getFirstTextNodeNotBefore(
        container.querySelector('#too-far')
      );
      assert.equal(result.nodeValue, 'text first');
    });

    it('returns null if no text node exists', () => {
      const span = document.createElement('span');
      container.appendChild(span);
      assert.equal(getFirstTextNodeNotBefore(span), null);
    });
  });

  describe('xpathFromNode', () => {
    let container;
    const html = `
        <h1 id="h1-1">text</h1>
        <p id="p-1">text<br/><br/><a id="a-1">text</a></p>
        <p id="p-2">text<br/><em id="em-1"><br/>text</em>text</p>
        <span>
          <ul>
            <li id="li-1">text1</li>
            <li id="li-2">text</li>
            <li id="li-3">text</li>
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

    it('throws an error if the provided node is not a descendant of the root node', () => {
      const node = document.createElement('p'); // not attached to DOM
      assert.throws(() => {
        xpathFromNode(node, document.body);
      }, 'Node is not a descendant of root');
    });

    [
      {
        id: 'a-1',
        xpaths: ['/div[1]/p[1]/a[1]', '/div[1]/p[1]/a[1]/text()[1]'],
      },
      {
        id: 'h1-1',
        xpaths: ['/div[1]/h1[1]', '/div[1]/h1[1]/text()[1]'],
      },
      {
        id: 'p-1',
        xpaths: ['/div[1]/p[1]', '/div[1]/p[1]/text()[1]'],
      },
      {
        id: 'a-1',
        xpaths: ['/div[1]/p[1]/a[1]', '/div[1]/p[1]/a[1]/text()[1]'],
      },
      {
        id: 'p-2',
        xpaths: [
          '/div[1]/p[2]',
          '/div[1]/p[2]/text()[1]',
          '/div[1]/p[2]/text()[2]',
        ],
      },
      {
        id: 'em-1',
        xpaths: ['/div[1]/p[2]/em[1]', '/div[1]/p[2]/em[1]/text()[1]'],
      },
      {
        id: 'li-3',
        xpaths: [
          '/div[1]/span[1]/ul[1]/li[3]',
          '/div[1]/span[1]/ul[1]/li[3]/text()[1]',
        ],
      },
    ].forEach(test => {
      it('produces the correct xpath for the provided node', () => {
        let node = document.getElementById(test.id);
        assert.equal(xpathFromNode(node, document.body), test.xpaths[0]);
      });

      it('produces the correct xpath for the provided text node(s)', () => {
        let node = document.getElementById(test.id).firstChild;
        // collect all text nodes after the target queried node.
        const textNodes = [];
        while (node) {
          if (node.nodeType === Node.TEXT_NODE) {
            textNodes.push(node);
          }
          node = node.nextSibling;
        }
        textNodes.forEach((node, index) => {
          assert.equal(
            xpathFromNode(node, document.body),
            test.xpaths[index + 1]
          );
        });
      });
    });
  });
});
