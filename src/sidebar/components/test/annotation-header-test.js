'use strict';

const { createElement } = require('preact');
const { shallow } = require('enzyme');

const unroll = require('../../../shared/test/util').unroll;
const fixtures = require('../../test/annotation-fixtures');

const AnnotationHeader = require('../annotation-header');
const AnnotationDocumentInfo = require('../annotation-document-info');
const Timestamp = require('../timestamp');

describe('AnnotationHeader', () => {
  const createAnnotationHeader = props => {
    return shallow(
      <AnnotationHeader
        annotation={fixtures.defaultAnnotation()}
        isEditing={false}
        isHighlight={false}
        isPrivate={false}
        onReplyCountClick={sinon.stub()}
        replyCount={0}
        showDocumentInfo={false}
        {...props}
      />
    );
  };

  describe('collapsed replies', () => {
    it('should have a callback', () => {
      const fakeCallback = sinon.stub();
      const wrapper = createAnnotationHeader({
        onReplyCountClick: fakeCallback,
      });
      const replyCollapseLink = wrapper.find('.annotation-link');
      assert.equal(replyCollapseLink.prop('onClick'), fakeCallback);
    });

    unroll(
      'it should render the annotation reply count',
      testCase => {
        const wrapper = createAnnotationHeader({
          replyCount: testCase.replyCount,
        });
        const replyCollapseLink = wrapper.find('.annotation-link');
        assert.equal(replyCollapseLink.text(), testCase.expected);
      },
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
      ]
    );
  });

  describe('timestamp', () => {
    it('should render a timestamp if annotation has an `updated` value', () => {
      const wrapper = createAnnotationHeader();
      const timestamp = wrapper.find(Timestamp);

      assert.isTrue(timestamp.exists());
    });

    it('should not render a timestamp if annotation does not have an `updated` value', () => {
      const wrapper = createAnnotationHeader({
        annotation: fixtures.newAnnotation(),
      });
      const timestamp = wrapper.find(Timestamp);

      assert.isFalse(timestamp.exists());
    });
  });

  describe('annotation is-highlight icon', () => {
    it('should display is-highlight icon if annotation is a highlight', () => {
      const wrapper = createAnnotationHeader({
        isEditing: false,
        isHighlight: true,
      });
      const highlightIcon = wrapper.find('.annotation-header__highlight');

      assert.isTrue(highlightIcon.exists());
    });

    it('should not display the is-highlight icon if annotation is not a highlight', () => {
      const wrapper = createAnnotationHeader({
        isEditing: false,
        isHighlight: false,
      });
      const highlightIcon = wrapper.find('.annotation-header__highlight');

      assert.isFalse(highlightIcon.exists());
    });
  });

  describe('annotation document info', () => {
    it('should render document info if `showDocumentInfo` is enabled', () => {
      const wrapper = createAnnotationHeader({ showDocumentInfo: true });

      const documentInfo = wrapper.find(AnnotationDocumentInfo);

      assert.isTrue(documentInfo.exists());
    });

    it('should not render document info if `showDocumentInfo` is not enabled', () => {
      const wrapper = createAnnotationHeader({ showDocumentInfo: false });

      const documentInfo = wrapper.find(AnnotationDocumentInfo);

      assert.isFalse(documentInfo.exists());
    });
  });

  context('user is editing annotation', () => {
    it('should not display timestamp', () => {
      const wrapper = createAnnotationHeader({
        annotation: fixtures.defaultAnnotation(),
        isEditing: true,
      });

      const timestamp = wrapper.find(Timestamp);

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
});
