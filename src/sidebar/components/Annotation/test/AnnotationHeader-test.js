import {
  checkAccessibility,
  mockImportedComponents,
} from '@hypothesis/frontend-testing';
import { mount } from '@hypothesis/frontend-testing';

import * as fixtures from '../../../test/annotation-fixtures';
import AnnotationHeader, { $imports } from '../AnnotationHeader';

describe('AnnotationHeader', () => {
  let activeFeatures;
  let fakeAnnotationAuthorLink;
  let fakeAnnotationDisplayName;
  let fakeGroup;
  let fakeIsHighlight;
  let fakeIsReply;
  let fakeHasBeenEdited;
  let fakeIsPrivate;
  let fakeSettings;
  let fakeStore;

  const createAnnotationHeader = props => {
    return mount(
      <AnnotationHeader
        annotation={fixtures.defaultAnnotation()}
        isEditing={false}
        replyCount={0}
        threadIsCollapsed={false}
        settings={fakeSettings}
        {...props}
      />,
    );
  };

  beforeEach(() => {
    activeFeatures = {
      client_display_names: true,
    };

    fakeAnnotationAuthorLink = sinon
      .stub()
      .returns('http://www.example.com/user/');
    fakeAnnotationDisplayName = sinon.stub().returns('Wackford Squeers');
    fakeGroup = {
      name: 'My Group',
      links: {
        html: 'https://www.example.com',
      },
      type: 'private',
    };
    fakeIsHighlight = sinon.stub().returns(false);
    fakeIsReply = sinon.stub().returns(false);
    fakeHasBeenEdited = sinon.stub().returns(false);
    fakeIsPrivate = sinon.stub();

    fakeSettings = { usernameUrl: 'http://foo.bar/' };

    fakeStore = {
      defaultAuthority: sinon.stub().returns('example.com'),
      isFeatureEnabled: sinon.stub().callsFake(feature => {
        const enabled = activeFeatures[feature];
        if (enabled === undefined) {
          throw new Error(`Unknown feature "${feature}"`);
        }
        return enabled;
      }),
      getGroup: sinon.stub().returns(fakeGroup),
      getLink: sinon
        .stub()
        .withArgs('user')
        .returns('http://www.example.com/user/'),
      route: sinon.stub().returns('sidebar'),
      setExpanded: sinon.stub(),
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../../store': { useSidebarStore: () => fakeStore },
      '../../helpers/annotation-metadata': {
        isHighlight: fakeIsHighlight,
        isReply: fakeIsReply,
        hasBeenEdited: fakeHasBeenEdited,
      },
      '../../helpers/annotation-user': {
        annotationAuthorLink: fakeAnnotationAuthorLink,
        annotationDisplayName: fakeAnnotationDisplayName,
      },
      '../../helpers/permissions': {
        isPrivate: fakeIsPrivate,
      },
      '@hypothesis/annotation-ui': { AnnotationTimestamps: () => null },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  describe('only me icon', () => {
    it('should render an "Only Me" icon if the annotation is private', () => {
      fakeIsPrivate.returns(true);

      const wrapper = createAnnotationHeader();

      assert.isTrue(wrapper.find('LockFilledIcon').exists());
    });

    it('should not render an "Only Me" icon if the annotation is being edited', () => {
      fakeIsPrivate.returns(true);

      const wrapper = createAnnotationHeader({ isEditing: true });

      assert.isFalse(wrapper.find('LockFilledIcon').exists());
    });

    it('should not render an "Only Me" icon if the annotation is not private', () => {
      fakeIsPrivate.returns(false);

      const wrapper = createAnnotationHeader();

      assert.isFalse(wrapper.find('Icon').filter({ name: 'lock' }).exists());
    });
  });

  describe('annotation author (user) information', () => {
    it('should link to author activity if link available', () => {
      const wrapper = createAnnotationHeader();

      assert.equal(
        wrapper.find('AnnotationUser').props().authorLink,
        'http://www.example.com/user/',
      );
    });

    it('should not link to author if none provided', () => {
      fakeAnnotationAuthorLink.returns(undefined);

      const wrapper = createAnnotationHeader();

      assert.isUndefined(wrapper.find('AnnotationUser').props().authorLink);
    });

    it('should pass the display name to AnnotationUser', () => {
      const wrapper = createAnnotationHeader();
      assert.equal(
        wrapper.find('AnnotationUser').props().displayName,
        'Wackford Squeers',
      );
    });
  });

  describe('expand replies toggle button', () => {
    const findReplyButton = wrapper =>
      wrapper.find('LinkButton[title="Expand replies"]');

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
        assert.equal(replyCollapseButton.props().children, testCase.expected);
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
        annotation,
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
        annotation,
        threadIsCollapsed: true,
      });

      const timestamp = wrapper.find('AnnotationTimestamps');
      assert.equal(timestamp.props().withEditedTimestamp, false);
    });
  });

  describe('extended header information', () => {
    it('should render extended header information if annotation is not a reply', () => {
      fakeIsReply.returns(false);
      const wrapper = createAnnotationHeader();

      assert.equal(
        wrapper.find('[data-testid="extended-header-info"]').length,
        1,
      );
    });

    it('should not render extended header information if annotation is reply', () => {
      fakeIsReply.returns(true);
      const wrapper = createAnnotationHeader({
        showDocumentInfo: true,
      });

      assert.equal(
        wrapper.find('[data-testid="extended-header-info"]').length,
        0,
      );
    });

    describe('annotation is-highlight icon', () => {
      it('should display is-highlight icon if annotation is a highlight', () => {
        fakeIsHighlight.returns(true);
        const wrapper = createAnnotationHeader({
          isEditing: false,
        });

        assert.isTrue(wrapper.find('HighlightIcon').exists());
      });

      it('should not display the is-highlight icon if annotation is not a highlight', () => {
        fakeIsHighlight.returns(false);
        const wrapper = createAnnotationHeader({
          isEditing: false,
        });

        assert.isFalse(wrapper.find('HighlightIcon').exists());
      });
    });

    describe('Annotation group info', () => {
      [
        { route: 'sidebar', groupVisible: false },
        { route: 'notebook', groupVisible: true },
      ].forEach(({ route, groupVisible }) => {
        it('should render group if not in sidebar', () => {
          fakeStore.route.returns(route);
          const wrapper = createAnnotationHeader();
          assert.equal(
            wrapper.find('AnnotationGroupInfo').exists(),
            groupVisible,
          );
        });
      });

      it('should not render group if unavailable', () => {
        fakeStore.route.returns('notebook');
        fakeStore.getGroup.returns(undefined);
        const wrapper = createAnnotationHeader();

        assert.isFalse(wrapper.find('AnnotationGroupInfo').exists());
      });
    });

    describe('annotation document info', () => {
      [
        { route: 'sidebar', shouldRenderDoc: false },
        { route: 'notebook', shouldRenderDoc: true },
      ].forEach(({ route, shouldRenderDoc }) => {
        it('should not render document info if on sidebar route', () => {
          fakeStore.route.returns(route);
          const wrapper = createAnnotationHeader();

          assert.equal(
            wrapper.find('AnnotationDocumentInfo').exists(),
            shouldRenderDoc,
          );
        });
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
      const highlight = wrapper.find('Icon[name="highlight"]');

      assert.isFalse(highlight.exists());
    });
  });

  describe('page numbers', () => {
    beforeEach(() => {
      // Un-mock the `pageLabel` function.
      $imports.$restore({
        '../../helpers/annotation-metadata': true,
      });
    });

    it('should not display page number if missing', () => {
      const annotation = fixtures.defaultAnnotation();
      const wrapper = createAnnotationHeader({ annotation });
      assert.isFalse(wrapper.exists('[data-testid="page-number"]'));
    });

    it('should display page number if available', () => {
      const annotation = fixtures.defaultAnnotation();
      annotation.target[0].selector.push({
        type: 'PageSelector',
        index: 10,
        label: '11',
      });
      const wrapper = createAnnotationHeader({ annotation });
      const pageNumber = wrapper.find('[data-testid="page-number"]');
      assert.isTrue(pageNumber.exists());
      assert.equal(pageNumber.text(), 'p. 11');
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
    ]),
  );
});
