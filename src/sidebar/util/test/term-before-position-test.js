import { termBeforePosition } from '../term-before-position';

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
    },
    {
      text: 'Hello world$',
      expectedTerm: 'world',
    },

    // Position in the middle of words
    {
      text: 'Hell$o world',
      expectedTerm: 'Hell',
    },
    {
      text: 'Hello wor$ld',
      expectedTerm: 'wor',
    },

    // Position preceded by "empty space"
    {
      text: 'Hello $world',
      expectedTerm: '',
    },
    {
      text: `Text with
      multiple
      $
      lines
      `,
      expectedTerm: '',
    },

    // Position preceded by/in the middle of a word for multi-line text
    {
      text: `Text with$
      multiple
      
      lines
      `,
      expectedTerm: 'with',
    },
    {
      text: `Text with
      multiple
      
      li$nes
      `,
      expectedTerm: 'li',
    },
  ].forEach(({ text, expectedTerm }) => {
    it('returns the term right before provided position', () => {
      // Get the position of the `$` sign in the text, then remove it
      const position = text.indexOf('$');
      const textWithoutDollarSign = text.replace('$', '');

      assert.equal(
        termBeforePosition(textWithoutDollarSign, position),
        expectedTerm,
      );
    });
  });
});
