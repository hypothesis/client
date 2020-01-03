const { toRange } = require('../text-position');

describe('text-position', () => {
  let container;

  before(() => {
    container = document.createElement('div');
    container.innerHTML = `<h1>Test article</h1>
<p>First paragraph.</p>
<p>Second paragraph.</p>`;
  });

  after(() => {
    container.remove();
  });

  describe('toRange', () => {
    const testCase = (description, text) => ({
      description,
      text,
      expected: text,
    });

    [
      testCase('start text of root', 'Test article'),
      testCase('a whole text node', 'First paragraph.'),
      testCase('end text of root', 'Second paragraph.'),
      testCase('part of a text node', 'rst paragraph'),
      {
        description: 'negative start offset',
        start: -5,
        end: 5,
        expected: new Error('invalid start offset'),
      },
      {
        description: 'invalid start offset',
        start: 1000,
        end: 1010,
        expected: new Error('invalid start offset'),
      },
      {
        description: 'invalid end offset',
        start: 0,
        end: 1000,
        expected: new Error('invalid end offset'),
      },
      {
        description: 'an empty range',
        start: 0,
        end: 0,
        expected: '',
      },
      {
        description: 'a range with end < start',
        start: 10,
        end: 5,
        expected: '',
      },
    ].forEach(({ description, start, end, expected, text }) => {
      it(`returns a range with the correct text (${description})`, () => {
        if (text) {
          start = container.textContent.indexOf(text);
          end = start + text.length;
        }

        if (expected instanceof Error) {
          assert.throws(() => {
            toRange(container, start, end);
          }, expected.message);
        } else {
          const range = toRange(container, start, end);
          assert.equal(range.toString(), expected);
        }
      });
    });
  });
});
