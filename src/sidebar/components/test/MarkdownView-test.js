import { mount } from 'enzyme';

import { checkAccessibility } from '../../../test-util/accessibility';
import MarkdownView, { $imports } from '../MarkdownView';

describe('MarkdownView', () => {
  let fakeRenderMathAndMarkdown;
  let fakeReplaceLinksWithEmbeds;

  const markdownSelector = '[data-testid="markdown-text"]';

  beforeEach(() => {
    fakeRenderMathAndMarkdown = markdown => `rendered:${markdown}`;
    fakeReplaceLinksWithEmbeds = sinon.stub();

    $imports.$mock({
      '../render-markdown': {
        renderMathAndMarkdown: fakeRenderMathAndMarkdown,
      },
      '../media-embedder': {
        replaceLinksWithEmbeds: fakeReplaceLinksWithEmbeds,
      },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('renders nothing if no markdown is provided', () => {
    const wrapper = mount(<MarkdownView />);
    assert.equal(wrapper.text(), '');
  });

  it('renders markdown as HTML', () => {
    const wrapper = mount(<MarkdownView markdown="**test**" />);
    const rendered = wrapper.find(markdownSelector).getDOMNode();
    assert.equal(rendered.innerHTML, 'rendered:**test**');
  });

  it('re-renders markdown after an update', () => {
    const wrapper = mount(<MarkdownView markdown="**test**" />);
    wrapper.setProps({ markdown: '_updated_' });
    const rendered = wrapper.find(markdownSelector).getDOMNode();
    assert.equal(rendered.innerHTML, 'rendered:_updated_');
  });

  it('replaces links with embeds in rendered output', () => {
    const wrapper = mount(<MarkdownView markdown="**test**" />);
    const rendered = wrapper.find(markdownSelector).getDOMNode();
    assert.calledWith(fakeReplaceLinksWithEmbeds, rendered, {
      className: sinon.match.string,
    });
  });

  it('applies `textClass` class to container', () => {
    const wrapper = mount(
      <MarkdownView markdown="foo" classes={'fancy-effect'} />,
    );
    assert.isTrue(wrapper.find('.fancy-effect').exists());
  });

  it('applies `textStyle` style to container', () => {
    const wrapper = mount(
      <MarkdownView markdown="foo" style={{ fontFamily: 'serif' }} />,
    );
    assert.deepEqual(wrapper.find(markdownSelector).prop('style'), {
      fontFamily: 'serif',
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      // eslint-disable-next-line react/display-name
      content: () => <MarkdownView markdown="foo" />,
    }),
  );
});
