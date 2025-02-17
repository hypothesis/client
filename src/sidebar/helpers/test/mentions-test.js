import {
  processAndReplaceMentionElements,
  unwrapMentions,
  wrapMentions,
  getContainingMentionOffsets,
  termBeforePosition,
} from '../mentions';

/**
 * @param {string} username
 * @param {string} [authority]
 * @param {'link'|'no-link'|'invalid'} [type]
 * @returns {HTMLAnchorElement}
 */
function mentionElement({ username, authority = 'hypothes.is', type }) {
  const element = document.createElement('a');

  element.setAttribute('data-hyp-mention', '');
  element.setAttribute('data-userid', `acct:${username}@${authority}`);

  if (type) {
    element.setAttribute('data-hyp-mention-type', type);
  }

  element.textContent = `@${username}`;

  return element;
}

const mentionTag = (username, authority) =>
  mentionElement({ username, authority }).outerHTML;

[
  // Mention at the end
  {
    text: 'Hello @sean',
    authority: 'hypothes.is',
    textWithTags: `Hello ${mentionTag('sean', 'hypothes.is')}`,
  },
  // Mention at the beginning
  {
    text: '@jane look at this',
    authority: 'example.com',
    textWithTags: `${mentionTag('jane', 'example.com')} look at this`,
  },
  // Mention in the middle
  {
    text: 'foo @mention bar',
    authority: 'example.com',
    textWithTags: `foo ${mentionTag('mention', 'example.com')} bar`,
  },
  // Multi-line mentions
  {
    text: `@username hello
@another how are you
look at @foo comment`,
    authority: 'example.com',
    textWithTags: `${mentionTag('username', 'example.com')} hello
${mentionTag('another', 'example.com')} how are you
look at ${mentionTag('foo', 'example.com')} comment`,
  },
  // No mentions
  {
    text: 'Just some text',
    authority: 'example.com',
    textWithTags: 'Just some text',
  },
  // Multiple mentions
  {
    text: 'Hey @jane, look at this quote from @rob',
    authority: 'example.com',
    textWithTags: `Hey ${mentionTag('jane', 'example.com')}, look at this quote from ${mentionTag('rob', 'example.com')}`,
  },
  // Mentions wrapped in punctuation chars
  {
    text: '(@jane) {@rob} and @john?',
    authority: 'example.com',
    textWithTags: `(${mentionTag('jane', 'example.com')}) {${mentionTag('rob', 'example.com')}} and ${mentionTag('john', 'example.com')}?`,
  },
  // username-like patterns with invalid chars should be ignored
  {
    text: 'Hello @not+a/user=name',
    authority: 'example.com',
    textWithTags: `Hello @not+a/user=name`,
  },
  // Email addresses should be ignored
  {
    text: 'Ignore email: noreply@hypothes.is',
    authority: 'example.com',
    textWithTags: 'Ignore email: noreply@hypothes.is',
  },
  // Trailing dots should not be considered part of the mention, but dots
  // in-between should
  {
    text: 'Hello @jane.doe.',
    authority: 'example.com',
    textWithTags: `Hello ${mentionTag('jane.doe', 'example.com')}.`,
  },
].forEach(({ text, authority, textWithTags }) => {
  describe('wrapMentions', () => {
    it('wraps every mention in a mention tag', () => {
      assert.equal(wrapMentions(text, authority), textWithTags);
    });
  });

  describe('unwrapMentions', () => {
    it('removes wrapping mention tags', () => {
      assert.equal(unwrapMentions(textWithTags), text);
    });
  });
});

describe('processAndReplaceMentionElements', () => {
  it('processes every mention tag based on provided list of mentions', () => {
    const mentions = [
      {
        userid: 'acct:janedoe@hypothes.is',
        link: 'http://example.com/janedoe',
      },
      {
        userid: 'acct:johndoe@hypothes.is',
        link: null,
      },
    ];

    const container = document.createElement('div');
    container.innerHTML = `
      <p>Correct mention: ${mentionTag('janedoe', 'hypothes.is')}</p>
      <p>Non-link mention: ${mentionTag('johndoe', 'hypothes.is')}</p>
      <p>Invalid mention: ${mentionTag('invalid', 'hypothes.is')}</p>
      <p>Mention without ID: <a data-hyp-mention="">@user_id_missing</a></p>
    `;

    const result = processAndReplaceMentionElements(container, mentions);
    assert.equal(result.size, 4);

    const [
      [firstElement, firstMention],
      [secondElement, secondMention],
      [thirdElement, thirdMention],
      [fourthElement, fourthMention],
    ] = [...result.entries()];

    // First element will render as an actual anchor with href
    assert.equal(firstElement.tagName, 'A');
    assert.equal(
      firstElement.getAttribute('href'),
      'http://example.com/janedoe',
    );
    assert.equal(firstElement.dataset.hypMentionType, 'link');
    assert.equal(firstMention, mentions[0]);

    // Second element will render as a highlighted span
    assert.equal(secondElement.tagName, 'SPAN');
    assert.equal(secondElement.dataset.userid, 'acct:johndoe@hypothes.is');
    assert.equal(secondElement.dataset.hypMentionType, 'no-link');
    assert.isTrue(secondElement.hasAttribute('data-userid'));
    assert.equal(secondMention, mentions[1]);

    // Third and fourth elements will be invalid mentions wrapping the invalid
    // username
    assert.equal(thirdElement.tagName, 'SPAN');
    assert.isFalse(thirdElement.hasAttribute('data-userid'));
    assert.equal(thirdElement.dataset.hypMentionType, 'invalid');
    assert.equal(thirdMention, '@invalid');
    assert.equal(fourthElement.tagName, 'SPAN');
    assert.isFalse(fourthElement.hasAttribute('data-userid'));
    assert.equal(fourthElement.dataset.hypMentionType, 'invalid');
    assert.equal(fourthMention, '@user_id_missing');
  });

  it('returns already-processed mention elements unchanged', () => {
    const mentions = [
      {
        userid: 'acct:janedoe@hypothes.is',
        link: 'http://example.com/janedoe',
      },
      {
        userid: 'acct:johndoe@hypothes.is',
        link: null,
      },
    ];

    const container = document.createElement('div');
    const correctProcessedMention = mentionElement({
      username: 'janedoe',
      type: 'link',
    });
    const nonLinkProcessedMention = mentionElement({
      username: 'johndoe',
      type: 'no-link',
    });
    const invalidProcessedMention = mentionElement({
      username: 'invalid',
      type: 'invalid',
    });

    container.append(
      correctProcessedMention,
      nonLinkProcessedMention,
      invalidProcessedMention,
    );

    const result = processAndReplaceMentionElements(container, mentions);
    assert.equal(result.size, 3);

    const [
      [firstElement, firstMention],
      [secondElement, secondMention],
      [thirdElement, thirdMention],
    ] = [...result.entries()];

    assert.equal(firstElement, correctProcessedMention);
    assert.equal(firstMention, mentions[0]);

    assert.equal(secondElement, nonLinkProcessedMention);
    assert.equal(secondMention, mentions[1]);

    assert.equal(thirdElement, invalidProcessedMention);
    assert.equal(thirdMention, '@invalid');
  });
});

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

  // Including punctuation characters
  ...[
    ',',
    '.',
    ';',
    ':',
    '|',
    '?',
    '!',
    "'",
    '"',
    '-',
    '(',
    ')',
    '[',
    ']',
    '{',
    '}',
  ].flatMap(char => [
    {
      text: `Foo${char}$ bar`,
      expectedTerm: '',
      expectedOffsets: { start: 4, end: 4 },
    },
    {
      text: `${char}Foo$ bar`,
      expectedTerm: 'Foo',
      expectedOffsets: { start: 1, end: 4 },
    },
    {
      text: `hello ${char}fo$o${char} bar`,
      expectedTerm: 'fo',
      expectedOffsets: { start: 7, end: 10 },
    },
  ]),
].forEach(({ text, expectedTerm, expectedOffsets }) => {
  // Get the position of the `$` sign in the text, then remove it
  const position = text.indexOf('$');
  const textWithoutDollarSign = text.replace('$', '');

  describe('termBeforePosition', () => {
    it('returns the term right before provided position', () => {
      assert.equal(
        termBeforePosition(textWithoutDollarSign, position),
        expectedTerm,
      );
    });
  });

  describe('getContainingMentionOffsets', () => {
    it('returns expected offsets', () => {
      assert.deepEqual(
        getContainingMentionOffsets(textWithoutDollarSign, position),
        expectedOffsets,
      );
    });
  });
});
