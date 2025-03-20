import {
  processAndReplaceMentionElements,
  unwrapMentions,
  wrapMentions,
  getContainingMentionOffsets,
  termBeforePosition,
  toPlainTextMention,
  wrapDisplayNameMentions,
} from '../mentions';

/**
 * @param {string} username
 * @param {string} [authority] - Defaults to 'hypothes.is'
 * @param {string} [content] - Defaults to `@${username}`
 * @param {'link'|'no-link'|'invalid'} [type]
 * @returns {HTMLAnchorElement}
 */
function mentionElement({
  username,
  authority = 'hypothes.is',
  content = `@${username}`,
  type,
}) {
  const element = document.createElement('a');

  element.setAttribute('data-hyp-mention', '');
  element.setAttribute('data-userid', `acct:${username}@${authority}`);

  if (type) {
    element.setAttribute('data-hyp-mention-type', type);
  }

  element.textContent = content;

  return element;
}

const mentionTag = (username, authority) =>
  mentionElement({ username, authority }).outerHTML;

/**
 * @param {string} displayName
 * @param {string} username
 * @param {string} [authority]
 */
const displayNameMentionTag = (displayName, username, authority) =>
  mentionElement({ content: `@${displayName}`, username, authority }).outerHTML;

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
  // Mentions wrapped in boundary chars
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
  // HTML chars should not be encoded
  {
    text: `> Quote
Hello @jane.doe.`,
    authority: 'example.com',
    textWithTags: `> Quote
Hello ${mentionTag('jane.doe', 'example.com')}.`,
  },
  {
    text: `test <>&"' @jane.doe`,
    authority: 'example.com',
    textWithTags: `test <>&"' ${mentionTag('jane.doe', 'example.com')}`,
  },
].forEach(({ text, authority, textWithTags }) => {
  describe('wrapMentions', () => {
    it('wraps every mention in a mention tag', () => {
      assert.equal(wrapMentions(text, authority), textWithTags);
    });
  });

  describe('unwrapMentions - `username` mode', () => {
    it('removes wrapping mention tags', () => {
      assert.equal(
        unwrapMentions({ text: textWithTags, mentionMode: 'username' }),
        text,
      );
    });
  });
});

[
  // Mention at the end
  {
    text: 'Hello @[John Doe]',
    usersMap: new Map([['John Doe', { userid: 'acct:john_doe@hypothes.is' }]]),
    textWithTags: `Hello ${displayNameMentionTag('John Doe', 'john_doe')}`,
  },
  // Mention at the beginning
  {
    text: '@[Jane Doe] look at this',
    usersMap: new Map([['Jane Doe', { userid: 'acct:jane_doe@hypothes.is' }]]),
    textWithTags: `${displayNameMentionTag('Jane Doe', 'jane_doe')} look at this`,
  },
  // Mention not found in users map
  {
    text: '@[Jane Doe] look at this',
    usersMap: new Map(),
    textWithTags: `@[Jane Doe] look at this`,
  },
  // Mention in the middle
  {
    text: 'foo @[Jane Doe] bar',
    usersMap: new Map([['Jane Doe', { userid: 'acct:jane_doe@hypothes.is' }]]),
    textWithTags: `foo ${displayNameMentionTag('Jane Doe', 'jane_doe')} bar`,
  },
  // Multi-line mentions
  {
    text: `@[Albert Banana] hello
  @[Someone Else] how are you
  look at @[Foo] comment`,
    usersMap: new Map([
      ['Albert Banana', { userid: 'acct:username@example.com' }],
      ['Someone Else', { userid: 'acct:another@example.com' }],
      ['Foo', { userid: 'acct:foo@example.com' }],
    ]),
    textWithTags: `${displayNameMentionTag('Albert Banana', 'username', 'example.com')} hello
  ${displayNameMentionTag('Someone Else', 'another', 'example.com')} how are you
  look at ${displayNameMentionTag('Foo', 'foo', 'example.com')} comment`,
  },
  // No mentions
  {
    text: 'Just some text',
    usersMap: new Map(),
    textWithTags: 'Just some text',
  },
  // Mentions wrapped in boundary chars
  {
    text: '(@[Albert Banana]), {@[Jane Doe]} and [@[Someone Else]]',
    usersMap: new Map([
      ['Albert Banana', { userid: 'acct:username@hypothes.is' }],
      ['Jane Doe', { userid: 'acct:jane_doe@hypothes.is' }],
      ['Someone Else', { userid: 'acct:another@hypothes.is' }],
    ]),
    textWithTags: `(${displayNameMentionTag('Albert Banana', 'username')}), {${displayNameMentionTag('Jane Doe', 'jane_doe')}} and [${displayNameMentionTag('Someone Else', 'another')}]`,
  },
  // Mentions containing boundary chars
  {
    text: 'Hello @[Dwayne "The Rock" Johnson]',
    usersMap: new Map([
      ['Dwayne "The Rock" Johnson', { userid: 'acct:djohnson@hypothes.is' }],
    ]),
    textWithTags: `Hello ${displayNameMentionTag('Dwayne "The Rock" Johnson', 'djohnson')}`,
  },
].forEach(({ text, usersMap, textWithTags }) => {
  describe('wrapDisplayNameMentions', () => {
    it('wraps every display-name mention in a mention tag', () => {
      assert.equal(wrapDisplayNameMentions(text, usersMap), textWithTags);
    });
  });

  describe('unwrapMentions - `display-name` mode', () => {
    it('removes wrapping mention tags', () => {
      assert.equal(
        unwrapMentions({ text: textWithTags, mentionMode: 'display-name' }),
        text,
      );
    });
  });
});

describe('unwrapMentions', () => {
  [
    // Mention not found. Tag content kept
    {
      mentionMode: 'username',
      mentions: [],
      text: `Hello ${mentionTag('jane_doe')}`,
      expectedResult: 'Hello @jane_doe',
    },
    {
      mentionMode: 'display-name',
      mentions: [],
      text: `Hello ${displayNameMentionTag('Jane Doe', 'jane_doe')}`,
      expectedResult: 'Hello @[Jane Doe]',
    },

    // Mention found with a new username
    {
      mentionMode: 'username',
      mentions: [
        {
          original_userid: 'acct:jane_doe@hypothes.is',
          username: 'jane_edited',
        },
      ],
      text: `Hello ${mentionTag('jane_doe')}`,
      expectedResult: 'Hello @jane_edited',
    },

    // Mention found with a new display name
    {
      mentionMode: 'display-name',
      mentions: [
        {
          original_userid: 'acct:jane_doe@hypothes.is',
          display_name: 'My new name',
        },
      ],
      text: `Hello ${displayNameMentionTag('Jane Doe', 'jane_doe')}`,
      expectedResult: 'Hello @[My new name]',
    },

    // Mention found with a now empty display name
    {
      mentionMode: 'display-name',
      mentions: [
        {
          original_userid: 'acct:jane_doe@hypothes.is',
          display_name: '',
        },
      ],
      text: `Hello ${displayNameMentionTag('Jane Doe', 'jane_doe')}`,
      expectedResult: 'Hello @[Jane Doe]',
    },

    // data-userid not present
    {
      mentionMode: 'username',
      mentions: [],
      text: 'Hello <a data-hyp-mention="">@user_id_missing</a>',
      expectedResult: 'Hello @user_id_missing',
    },
    {
      mentionMode: 'display-name',
      mentions: [],
      text: 'Hello <a data-hyp-mention="">@User ID Missing</a>',
      expectedResult: 'Hello @[User ID Missing]',
    },
  ].forEach(({ text, mentionMode, mentions, expectedResult }) => {
    it('replaces mention tag with current username or display name', () => {
      assert.equal(
        unwrapMentions({ text, mentionMode, mentions }),
        expectedResult,
      );
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

    const result = processAndReplaceMentionElements(
      container,
      mentions,
      'username',
    );
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

    const result = processAndReplaceMentionElements(
      container,
      mentions,
      'username',
    );
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

  [
    {
      mentionMode: 'username',
      oldContent: '@janedoe',
      mention: { username: 'janedoe_updated' },
      expectedContent: '@janedoe_updated',
    },
    {
      mentionMode: 'display-name',
      oldContent: '@Jane Doe',
      mention: { display_name: 'Jane Doe Updated' },
      expectedContent: '@Jane Doe Updated',
    },
    {
      mentionMode: 'display-name',
      oldContent: '@Jane Doe',
      mention: { display_name: '' },
      expectedContent: '@Jane Doe',
    },
  ].forEach(({ mentionMode, oldContent, mention, expectedContent }) => {
    it('returns most recent usernames or display names', () => {
      const mentions = [
        {
          userid: 'acct:janedoe@hypothes.is',
          ...mention,
        },
      ];
      const container = document.createElement('div');
      container.innerHTML = mentionElement({
        username: 'janedoe',
        content: oldContent,
      }).outerHTML;

      const result = processAndReplaceMentionElements(
        container,
        mentions,
        mentionMode,
      );
      const [[mentionEl]] = [...result.entries()];

      assert.equal(mentionEl.textContent, expectedContent);
    });
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

  // Including boundary characters
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

describe('toPlainTextMention', () => {
  [
    {
      mentionMode: 'username',
      expectedMention: '@jane_doe',
    },
    {
      mentionMode: 'display-name',
      expectedMention: '@[Jane Doe]',
    },
  ].forEach(({ expectedMention, mentionMode }) => {
    it('returns expected format', () => {
      const user = {
        userid: 'acct:jane_doe@foo.com',
        username: 'jane_doe',
        displayName: 'Jane Doe',
      };

      assert.equal(toPlainTextMention(user, mentionMode), expectedMention);
    });
  });

  it('removes square brackets in display-name mode', () => {
    const user = {
      userid: 'acct:jane_doe@foo.com',
      username: 'jane_doe',
      displayName: 'Jane [Doe] [More Brackets]',
    };

    assert.equal(
      toPlainTextMention(user, 'display-name'),
      '@[Jane Doe More Brackets]',
    );
  });
});
