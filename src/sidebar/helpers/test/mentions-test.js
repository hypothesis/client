import { renderMentionTags, unwrapMentions, wrapMentions } from '../mentions';

const mentionTag = (username, authority) =>
  `<a data-hyp-mention="" data-userid="acct:${username}@${authority}">@${username}</a>`;

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
    text: 'Hey @jane look at this quote from @rob',
    authority: 'example.com',
    textWithTags: `Hey ${mentionTag('jane', 'example.com')} look at this quote from ${mentionTag('rob', 'example.com')}`,
  },
  // Email addresses should be ignored
  {
    text: 'Ignore email: noreply@hypothes.is',
    authority: 'example.com',
    textWithTags: 'Ignore email: noreply@hypothes.is',
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

describe('renderMentionTags', () => {
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

    const result = renderMentionTags(container, mentions);
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
    assert.equal(firstMention, mentions[0]);

    // Second element will render as a highlighted span
    assert.equal(secondElement.tagName, 'SPAN');
    assert.equal(secondElement.dataset.userid, 'acct:johndoe@hypothes.is');
    assert.isTrue(secondElement.hasAttribute('data-hyp-mention'));
    assert.equal(secondMention, mentions[1]);

    // Third and fourth elements will be invalid mentions wrapping the invalid
    // username
    assert.equal(thirdElement.tagName, 'SPAN');
    assert.isFalse(thirdElement.hasAttribute('data-hyp-mention'));
    assert.equal(thirdMention, '@invalid');
    assert.equal(fourthElement.tagName, 'SPAN');
    assert.isFalse(fourthElement.hasAttribute('data-hyp-mention'));
    assert.equal(fourthMention, '@user_id_missing');
  });
});
