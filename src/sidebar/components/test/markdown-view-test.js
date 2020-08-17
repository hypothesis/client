import { mount } from 'enzyme';
import { createElement } from 'preact';

import MarkdownView from '../markdown-view';
import { $imports } from '../markdown-view';

import { checkAccessibility } from '../../../test-util/accessibility';

describe('MarkdownView', () => {
  let fakeMediaEmbedder;
  let fakeRenderMarkdown;

  beforeEach(() => {
    fakeRenderMarkdown = markdown => `rendered:${markdown}`;
    fakeMediaEmbedder = {
      replaceLinksWithEmbeds: sinon.stub(),
    };

    $imports.$mock({
      '../render-markdown': fakeRenderMarkdown,
      '../media-embedder': fakeMediaEmbedder,
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('renders nothing if no markdown is provied', () => {
    const wrapper = mount(<MarkdownView />);
    assert.equal(wrapper.text(), '');
  });

  it('renders markdown as HTML', () => {
    const wrapper = mount(<MarkdownView markdown="**test**" />);
    const rendered = wrapper.find('.markdown-view').getDOMNode();
    assert.equal(rendered.innerHTML, 'rendered:**test**');
  });

  it('re-renders markdown after an update', () => {
    const wrapper = mount(<MarkdownView markdown="**test**" />);
    wrapper.setProps({ markdown: '_updated_' });
    const rendered = wrapper.find('.markdown-view').getDOMNode();
    assert.equal(rendered.innerHTML, 'rendered:_updated_');
  });

  it('replaces links with embeds in rendered output', () => {
    const wrapper = mount(<MarkdownView markdown="**test**" />);
    const rendered = wrapper.find('.markdown-view').getDOMNode();
    assert.calledWith(fakeMediaEmbedder.replaceLinksWithEmbeds, rendered, {
      className: 'markdown-view__embed',
    });
  });

  it('applies `textClass` class to container', () => {
    const wrapper = mount(
      <MarkdownView markdown="foo" textClass={{ 'fancy-effect': true }} />
    );
    assert.isTrue(wrapper.find('.markdown-view.fancy-effect').exists());
  });

  it('applies `textStyle` style to container', () => {
    const wrapper = mount(
      <MarkdownView markdown="foo" textStyle={{ fontFamily: 'serif' }} />
    );
    assert.deepEqual(wrapper.find('.markdown-view').prop('style'), {
      fontFamily: 'serif',
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      // eslint-disable-next-line react/display-name
      content: () => <MarkdownView markdown="foo" />,
    })
  );
});
