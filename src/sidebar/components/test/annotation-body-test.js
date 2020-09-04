import { mount } from 'enzyme';
import { createElement } from 'preact';
import { act } from 'preact/test-utils';

import * as fixtures from '../../test/annotation-fixtures';

import AnnotationBody from '../annotation-body';
import { $imports } from '../annotation-body';

import { checkAccessibility } from '../../../test-util/accessibility';
import mockImportedComponents from '../../../test-util/mock-imported-components';

describe('AnnotationBody', () => {
  let fakeAnnotation;
  let fakeApplyTheme;
  let fakeSettings;

  function createBody(props = {}) {
    return mount(
      <AnnotationBody
        annotation={fakeAnnotation}
        settings={fakeSettings}
        {...props}
      />
    );
  }

  beforeEach(() => {
    fakeAnnotation = fixtures.defaultAnnotation();
    fakeAnnotation.text = 'some text here';
    fakeAnnotation.tags = ['eenie', 'minie'];
    fakeApplyTheme = sinon.stub();
    fakeSettings = {};

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../util/theme': { applyTheme: fakeApplyTheme },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('does not render controls to expand/collapse the excerpt if it is not collapsible', () => {
    const wrapper = createBody();

    // By default, `isCollapsible` is `false` until changed by `Excerpt`,
    // so the expand/collapse button will not render
    assert.isFalse(wrapper.find('Button').exists());
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
    assert.equal(
      button.props().title,
      'Toggle visibility of full annotation text'
    );
    assert.isFalse(button.props().isExpanded);
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
    assert.equal(
      buttonProps.title,
      'Toggle visibility of full annotation text'
    );
    assert.isTrue(buttonProps.isExpanded);
  });

  describe('tag list and editor', () => {
    it('renders a list of tags if annotation has tags', () => {
      const wrapper = createBody();

      assert.isTrue(wrapper.find('TagList').exists());
    });

    it('does not render a tag list if annotation has no tags', () => {
      const wrapper = createBody({ annotation: fixtures.defaultAnnotation() });

      assert.isFalse(wrapper.find('TagList').exists());
    });

    it('applies theme', () => {
      const textStyle = { fontFamily: 'serif' };
      fakeApplyTheme
        .withArgs(['annotationFontFamily'], fakeSettings)
        .returns(textStyle);

      const wrapper = createBody();
      assert.deepEqual(
        wrapper.find('MarkdownView').prop('textStyle'),
        textStyle
      );
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
        content: () => {
          const annotation = fixtures.defaultAnnotation();
          annotation.tags = ['foo', 'bar'];
          return createBody({ annotation });
        },
      },
      {
        name: 'when expandable',
        content: () => {
          const wrapper = createBody();
          act(() => {
            // change the `isCollapsible` state to `true` via the `Excerpt`
            wrapper.find('Excerpt').props().onCollapsibleChanged(true);
          });
          wrapper.update();
          return wrapper;
        },
      },
    ])
  );
});
