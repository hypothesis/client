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
  let fakeHasBeenEdited;
  let fakeIsPrivate;
  let fakeStore;

  const createAnnotationHeader = props => {
    return mount(
      <AnnotationHeader
        annotation={fixtures.defaultAnnotation()}
        isEditing={false}
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
    fakeHasBeenEdited = sinon.stub().returns(false);
    fakeIsPrivate = sinon.stub();

    fakeStore = {
      setExpanded: sinon.stub(),
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../store/use-store': { useStoreProxy: () => fakeStore },
      '../util/annotation-metadata': {
        isHighlight: fakeIsHighlight,
        isReply: fakeIsReply,
        hasBeenEdited: fakeHasBeenEdited,
      },
      '../util/permissions': {
        isPrivate: fakeIsPrivate,
      },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  describe('only me icon', () => {
    it('should render an "Only Me" icon if the annotation is private', () => {
      fakeIsPrivate.returns(true);

      const wrapper = createAnnotationHeader();

      assert.isTrue(wrapper.find('SvgIcon').filter({ name: 'lock' }).exists());
    });

    it('should not render an "Only Me" icon if the annotation is being edited', () => {
      fakeIsPrivate.returns(true);

      const wrapper = createAnnotationHeader({ isEditing: true });

      assert.isFalse(wrapper.find('SvgIcon').filter({ name: 'lock' }).exists());
    });

    it('should not render an "Only Me" icon if the annotation is not private', () => {
      fakeIsPrivate.returns(false);

      const wrapper = createAnnotationHeader();

      assert.isFalse(wrapper.find('SvgIcon').filter({ name: 'lock' }).exists());
    });
  });

  describe('expand replies toggle button', () => {
    const findReplyButton = wrapper =>
      wrapper.find('Button').filter('.annotation-header__reply-toggle');

    it('should render if annotation is a collapsed reply and there are replies to show', () => {
      fakeIsReply.returns(true);
      const wrapper = createAnnotationHeader({
        replyCount: 1,
        threadIsCollapsed: true,
      });

      const btn = findReplyButton(wrapper);
      assert.isTrue(btn.exists());
    });

    it('should expand replies when clicked', () => {
      fakeIsReply.returns(true);
      const fakeAnnotation = fixtures.defaultAnnotation();
      const wrapper = createAnnotationHeader({
        annotation: fakeAnnotation,
        replyCount: 1,
        threadIsCollapsed: true,
      });

      const btn = findReplyButton(wrapper);
      btn.props().onClick();

      assert.calledOnce(fakeStore.setExpanded);
      assert.calledWith(fakeStore.setExpanded, fakeAnnotation.id, true);
    });

    it('should not render if there are no replies to show', () => {
      fakeIsReply.returns(true);
      const wrapper = createAnnotationHeader({
        threadIsCollapsed: true,
        replyCount: 0,
      });
      const btn = findReplyButton(wrapper);
      assert.isFalse(btn.exists());
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
    it('should not render timestamps if annotation is missing `created` date', () => {
      const annotation = fixtures.defaultAnnotation();
      delete annotation.created;
      const wrapper = createAnnotationHeader({ annotation });

      const timestamp = wrapper.find('AnnotationTimestamps');

      assert.isFalse(timestamp.exists());
    });

    it('should render timestamps  if annotation has a `created` value', () => {
      const wrapper = createAnnotationHeader();
      const timestamp = wrapper.find('AnnotationTimestamps');

      assert.isTrue(timestamp.exists());
    });

    it('should render `updated` timestamp if annotation has an `updated` value', () => {
      const annotation = fixtures.defaultAnnotation();
      fakeHasBeenEdited.returns(true);

      const wrapper = createAnnotationHeader({
        annotation: annotation,
      });
      const timestamp = wrapper.find('AnnotationTimestamps');
      assert.equal(timestamp.props().withEditedTimestamp, true);
    });

    it('should not render edited timestamp if annotation has not been edited', () => {
      // Default annotation's created value is same as updated; as if the annotation
      // has not been edited before
      fakeHasBeenEdited.returns(false);
      const wrapper = createAnnotationHeader();

      const timestamp = wrapper.find('AnnotationTimestamps');
      assert.equal(timestamp.props().withEditedTimestamp, false);
    });

    it('should not render edited timestamp if annotation is collapsed reply', () => {
      fakeHasBeenEdited.returns(true);
      const annotation = fixtures.defaultAnnotation();
      annotation.updated = '2018-05-10T20:18:56.613388+00:00';
      fakeIsReply.returns(true);

      const wrapper = createAnnotationHeader({
        annotation: annotation,
        threadIsCollapsed: true,
      });

      const timestamp = wrapper.find('AnnotationTimestamps');
      assert.equal(timestamp.props().withEditedTimestamp, false);
    });
  });

  describe('extended header information', () => {
    it('should not render extended header information if annotation is reply', () => {
      fakeIsReply.returns(true);
      const wrapper = createAnnotationHeader({
        showDocumentInfo: true,
      });

      assert.isFalse(wrapper.find('AnnotationShareInfo').exists());
      assert.isFalse(wrapper.find('AnnotationDocumentInfo').exists());
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
  });

  context('user is editing annotation', () => {
    it('should not display timestamp', () => {
      const wrapper = createAnnotationHeader({
        annotation: fixtures.defaultAnnotation(),
        isEditing: true,
      });

      const timestamp = wrapper.find('AnnotationTimestamps');

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
