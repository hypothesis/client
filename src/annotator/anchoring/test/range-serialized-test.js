import { SerializedRange } from '../range-serialized';

describe('annotator/anchoring/range-serialized', () => {
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
    return new SerializedRange({
      start: container.querySelector('#p-1').firstChild,
      startOffset: 0,
      end: container.querySelector('#p-3').firstChild,
      endOffset: 0,
      ...props,
    });
  }

  describe('SerializedRange', () => {
    it('creates a SerializedRange instance', () => {
      createRange();
    });
  });
});
