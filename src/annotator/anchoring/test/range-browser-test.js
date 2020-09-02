import { BrowserRange } from '../range-browser';

describe('annotator/anchoring/range-browser', () => {
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
    container.innerHTML = html;
  });

  afterEach(() => {
    container.remove();
  });

  function createRange(props) {
    return new BrowserRange({
      commonAncestorContainer: container,
      startContainer: container.querySelector('#p-1').firstChild,
      startOffset: 0,
      endContainer: container.querySelector('#p-3').firstChild,
      endOffset: 0,
      ...props,
    });
  }

  describe('BrowserRange', () => {
    it('creates a BrowserRange instance', () => {
      createRange();
    });
  });
});
