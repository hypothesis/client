import { textInDOMRect } from '../text-in-rect';

describe('textInDOMRect', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.position = 'fixed';

    const leftColumn = document.createElement('p');
    leftColumn.className = 'left-column';
    Object.assign(leftColumn.style, {
      position: 'absolute',
      width: '200px',
    });
    leftColumn.append('Line one', document.createElement('br'), 'Line two');

    const rightColumn = document.createElement('p');
    rightColumn.className = 'right-column';
    Object.assign(rightColumn.style, {
      position: 'absolute',
      width: '200px',
      left: '200px',
    });
    rightColumn.append('Line three', document.createElement('br'), 'Line four');

    container.append(leftColumn, rightColumn);

    document.body.append(container);
  });

  afterEach(() => {
    container.remove();
  });

  [
    // Rect covering whole left column
    {
      rect: new DOMRect(0, 0, 200, 200),
      expected: 'Line one Line two',
    },
    // Rect covering whole right column
    {
      rect: new DOMRect(200, 0, 200, 200),
      expected: 'Line three Line four',
    },
    // Tiny rect touching first word in left column
    {
      rect: new DOMRect(10, 10, 1, 1),
      expected: 'Line',
    },
    // Zero-sized rect touching first word in left column
    {
      rect: new DOMRect(10, 10, 0, 0),
      expected: '',
    },
  ].forEach(({ rect, expected }) => {
    it('returns text in rect', () => {
      const text = textInDOMRect(container, rect);
      assert.equal(text, expected);
    });
  });

  it('only returns text from root container', () => {
    const leftColumn = container.querySelector('.left-column');
    const text = textInDOMRect(leftColumn, new DOMRect(0, 0, 500, 500));
    assert.equal(text, 'Line one Line two');
  });
});
