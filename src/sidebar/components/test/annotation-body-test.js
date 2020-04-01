import { mount } from 'enzyme';
import { createElement } from 'preact';
import { act } from 'preact/test-utils';

import * as fixtures from '../../test/annotation-fixtures';

import AnnotationBody from '../annotation-body';
import { $imports } from '../annotation-body';

import { checkAccessibility } from '../../../test-util/accessibility';
import mockImportedComponents from '../../../test-util/mock-imported-components';

describe('AnnotationBody', () => {
  function createBody(props = {}) {
    return mount(
      <AnnotationBody
        annotation={fixtures.defaultAnnotation()}
        isEditing={false}
        onEditTags={() => null}
        tags={[]}
        text="test comment"
        {...props}
      />
    );
  }

  beforeEach(() => {
    $imports.$mock(mockImportedComponents());
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('displays the body if `isEditing` is false', () => {
    const wrapper = createBody({ isEditing: false });
    assert.isFalse(wrapper.exists('MarkdownEditor'));
    assert.isTrue(wrapper.exists('MarkdownView'));
  });

  it('displays an editor if `isEditing` is true', () => {
    const wrapper = createBody({ isEditing: true });
    assert.isTrue(wrapper.exists('MarkdownEditor'));
    assert.isFalse(wrapper.exists('MarkdownView'));
  });

  it('does not render controls to expand/collapse the excerpt if it is not collapsible', () => {
    const wrapper = createBody();

    // By default, `isCollapsible` is `false` until changed by `Excerpt`,
    // so the expand/collapse button will not render
    assert.notOk(wrapper.find('Button').exists());
  });

  it('renders controls to expand/collapse the excerpt if it is collapsible', () => {
    const wrapper = createBody();
    const excerpt = wrapper.find('Excerpt');

    act(() => {
      // change the `isCollapsible` state to `true` via the `Excerpt`
      excerpt.props().onCollapsibleChanged(true);
    });
    wrapper.update();

    const button = wrapper.find('Button');
    assert.isOk(button.exists());
    assert.equal(button.props().buttonText, 'More');
    assert.equal(button.props().title, 'Show full annotation text');
  });

  it('shows appropriate button text to collapse the Excerpt if expanded', () => {
    const wrapper = createBody();
    const excerpt = wrapper.find('Excerpt');

    act(() => {
      // Get the `isCollapsible` state to `true`
      excerpt.props().onCollapsibleChanged(true);
      // Force a re-render so the button shows up
    });
    wrapper.update();

    act(() => {
      wrapper.find('Button').props().onClick();
    });
    wrapper.update();

    const buttonProps = wrapper.find('Button').props();

    assert.equal(buttonProps.buttonText, 'Less');
    assert.equal(buttonProps.title, 'Show the first few lines only');
  });

  describe('tag list and editor', () => {
    it('renders a list of tags if not editing and annotation has tags', () => {
      const wrapper = createBody({ isEditing: false, tags: ['foo', 'bar'] });

      assert.isTrue(wrapper.find('TagList').exists());
    });

    it('does not render a tag list if annotation has no tags', () => {
      const wrapper = createBody({ isEditing: false, tags: [] });

      assert.isFalse(wrapper.find('TagList').exists());
    });

    it('renders a tag editor if annotation is being edited', () => {
      const wrapper = createBody({ isEditing: true, tags: ['foo', 'bar'] });

      assert.isTrue(wrapper.find('TagEditor').exists());
      assert.isFalse(wrapper.find('TagList').exists());
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility([
      {
        content: () => createBody(),
      },
      {
        name: 'when annotation has tags (tag list)',
        content: () => createBody({ isEditing: false, tags: ['foo', 'bar'] }),
      },
      {
        name: 'when annotation is being edited and has tags',
        content: () => createBody({ isEditing: true, tags: ['foo', 'bar'] }),
      },
    ])
  );
});
