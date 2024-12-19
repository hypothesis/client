import {
  getContainingWordOffsets,
  termBeforePosition,
} from '../term-before-position';

describe('term-before-position', () => {
  // To make these tests more predictable, we place the `$` sign in the position
  // to be checked. That way it's easier to see what is the "word" preceding it.
  // The test will then get the `$` sign index and remove it from the text
  // before passing it to `termBeforePosition`.
  [
    // First and last positions
    {
      text: '$Hello world',
      expectedTerm: '',
      expectedOffsets: { start: 0, end: 5 },
    },
    {
      text: 'Hello world$',
      expectedTerm: 'world',
      expectedOffsets: { start: 6, end: 11 },
    },

    // Position in the middle of words
    {
      text: 'Hell$o world',
      expectedTerm: 'Hell',
      expectedOffsets: { start: 0, end: 5 },
    },
    {
      text: 'Hello wor$ld',
      expectedTerm: 'wor',
      expectedOffsets: { start: 6, end: 11 },
    },

    // Position preceded by "empty space"
    {
      text: 'Hello $world',
      expectedTerm: '',
      expectedOffsets: { start: 6, end: 11 },
    },
    {
      text: `Text with
      multiple
      $
      lines
      `,
      expectedTerm: '',
      expectedOffsets: { start: 31, end: 31 },
    },

    // Position preceded by/in the middle of a word for multi-line text
    {
      text: `Text with$
      multiple

      lines
      `,
      expectedTerm: 'with',
      expectedOffsets: { start: 5, end: 9 },
    },
    {
      text: `Text with
      multiple

      li$nes
      `,
      expectedTerm: 'li',
      expectedOffsets: { start: 32, end: 37 },
    },
  ].forEach(({ text, expectedTerm, expectedOffsets }) => {
    // Get the position of the `$` sign in the text, then remove it
    const position = text.indexOf('$');
    const textWithoutDollarSign = text.replace('$', '');

    it('`termBeforePosition` returns the term right before provided position', () => {
      assert.equal(
        termBeforePosition(textWithoutDollarSign, position),
        expectedTerm,
      );
    });

    it('`getContainingWordOffsets` returns expected offsets', () => {
      assert.deepEqual(
        getContainingWordOffsets(textWithoutDollarSign, position),
        expectedOffsets,
      );
    });
  });
});
