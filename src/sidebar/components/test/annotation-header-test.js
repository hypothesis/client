import { mount } from 'enzyme';
import { createElement } from 'preact';

import * as fixtures from '../../test/annotation-fixtures';
import AnnotationHeader from '../annotation-header';
import { $imports } from '../annotation-header';

import { checkAccessibility } from '../../../test-util/accessibility';
import mockImportedComponents from '../../../test-util/mock-imported-components';

describe('AnnotationHeader', () => {
  let fakeIsHighlight;
  let fakeIsReply;

  const createAnnotationHeader = props => {
    return mount(
      <AnnotationHeader
        annotation={fixtures.defaultAnnotation()}
        isEditing={false}
        onReplyCountClick={sinon.stub()}
        replyCount={0}
        showDocumentInfo={false}
        threadIsCollapsed={false}
        {...props}
      />
    );
  };

  beforeEach(() => {
    fakeIsHighlight = sinon.stub().returns(false);
    fakeIsReply = sinon.stub().returns(false);

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../util/annotation-metadata': {
        isHighlight: fakeIsHighlight,
        isReply: fakeIsReply,
      },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  describe('collapsed replies', () => {
    const findReplyButton = wrapper =>
      wrapper.find('Button').filter('.annotation-header__reply-toggle');

    it('should render if annotation is a reply and thread is collapsed', () => {
      let fakeCallback = sinon.stub();
      fakeIsReply.returns(true);
      const wrapper = createAnnotationHeader({
        onReplyCountClick: fakeCallback,
        threadIsCollapsed: true,
      });

      const btn = findReplyButton(wrapper);
      assert.isTrue(btn.exists());
      assert.equal(btn.props().onClick, fakeCallback);
    });

    it('should not render if annotation is not a reply', () => {
      fakeIsReply.returns(false);
      const wrapper = createAnnotationHeader({
        threadIsCollapsed: true,
      });
      const btn = findReplyButton(wrapper);
      assert.isFalse(btn.exists());
    });

    it('should not render if thread is not collapsed', () => {
      fakeIsReply.returns(true);
      const wrapper = createAnnotationHeader({
        threadIsCollapsed: false,
      });
      const btn = findReplyButton(wrapper);
      assert.isFalse(btn.exists());
    });

    [
      {
        replyCount: 0,
        expected: '0 replies',
      },
      {
        replyCount: 1,
        expected: '1 reply',
      },
      {
        replyCount: 2,
        expected: '2 replies',
      },
    ].forEach(testCase => {
      it(`it should render the annotation reply count button (${testCase.replyCount})`, () => {
        fakeIsReply.returns(true);
        const wrapper = createAnnotationHeader({
          replyCount: testCase.replyCount,
          threadIsCollapsed: true,
        });
        const replyCollapseButton = findReplyButton(wrapper);
        assert.equal(replyCollapseButton.props().buttonText, testCase.expected);
      });
    });
  });

  describe('timestamps', () => {
    it('should render timestamp container element if annotation has a `created` value', () => {
      const wrapper = createAnnotationHeader();
      const timestamp = wrapper.find('.annotation-header__timestamp');

      assert.isTrue(timestamp.exists());
    });

    it('should not render timestamp container if annotation does not have a `created` value', () => {
      const wrapper = createAnnotationHeader({
        annotation: fixtures.newAnnotation(),
      });
      const timestamp = wrapper.find('.annotation-header__timestamp');

      assert.isFalse(timestamp.exists());
    });

    it('should render edited timestamp if annotation has been edited', () => {
      const annotation = fixtures.defaultAnnotation();
      annotation.updated = '2018-05-10T20:18:56.613388+00:00';

      const wrapper = createAnnotationHeader({
        annotation: annotation,
      });
      const timestamp = wrapper
        .find('Timestamp')
        .filter('.annotation-header__timestamp-edited-link');

      assert.isTrue(timestamp.exists());
    });

    it('should not render edited timestamp if annotation has not been edited', () => {
      // Default annotation's created value is same as updated; as if the annotation
      // has not been edited before
      const wrapper = createAnnotationHeader({
        annotation: fixtures.newAnnotation(),
      });
      const timestamp = wrapper
        .find('Timestamp')
        .filter('.annotation-header__timestamp-edited-link');

      assert.isFalse(timestamp.exists());
    });
  });

  describe('annotation is-highlight icon', () => {
    it('should display is-highlight icon if annotation is a highlight', () => {
      fakeIsHighlight.returns(true);
      const wrapper = createAnnotationHeader({
        isEditing: false,
      });
      const highlightIcon = wrapper.find('.annotation-header__highlight');

      assert.isTrue(highlightIcon.exists());
    });

    it('should not display the is-highlight icon if annotation is not a highlight', () => {
      fakeIsHighlight.returns(false);
      const wrapper = createAnnotationHeader({
        isEditing: false,
      });
      const highlightIcon = wrapper.find('.annotation-header__highlight');

      assert.isFalse(highlightIcon.exists());
    });
  });

  describe('annotation document info', () => {
    it('should render document info if `showDocumentInfo` is enabled', () => {
      const wrapper = createAnnotationHeader({ showDocumentInfo: true });

      const documentInfo = wrapper.find('AnnotationDocumentInfo');

      assert.isTrue(documentInfo.exists());
    });

    it('should not render document info if `showDocumentInfo` is not enabled', () => {
      const wrapper = createAnnotationHeader({ showDocumentInfo: false });

      const documentInfo = wrapper.find('AnnotationDocumentInfo');

      assert.isFalse(documentInfo.exists());
    });
  });

  context('user is editing annotation', () => {
    it('should not display timestamp', () => {
      const wrapper = createAnnotationHeader({
        annotation: fixtures.defaultAnnotation(),
        isEditing: true,
      });

      const timestamp = wrapper.find('Timestamp');

      assert.isFalse(timestamp.exists());
    });

    it('should not display is-highlight icon', () => {
      const wrapper = createAnnotationHeader({
        annotation: fixtures.defaultAnnotation(),
        isEditing: true,
        isHighlight: true,
      });
      const highlight = wrapper.find('.annotation-header__highlight');

      assert.isFalse(highlight.exists());
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility([
      {
        name: 'not editing',
        content: () =>
          createAnnotationHeader({
            annotation: fixtures.defaultAnnotation(),
            isEditing: false,
          }),
      },
      {
        name: 'editing',
        content: () =>
          createAnnotationHeader({
            annotation: fixtures.defaultAnnotation(),
            isEditing: true,
          }),
      },
    ])
  );
});
