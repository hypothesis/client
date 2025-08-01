import {
  checkAccessibility,
  mockImportedComponents,
} from '@hypothesis/frontend-testing';
import { mount } from '@hypothesis/frontend-testing';
import sinon from 'sinon';

import * as fixtures from '../../../test/annotation-fixtures';
import Annotation, { $imports } from '../Annotation';

describe('Annotation', () => {
  // Dependency Mocks
  let fakeMetadata;
  let fakeAnnotationUser;

  // Injected dependency mocks
  let fakeAnnotationsService;
  let fakeStore;

  const setEditingMode = (isEditing = true) => {
    // The presence of a draft will make `isEditing` `true`
    if (isEditing) {
      fakeStore.getDraft.returns(fixtures.defaultDraft());
    } else {
      fakeStore.getDraft.returns(null);
    }
  };

  const createComponent = props => {
    return mount(
      <Annotation
        annotation={fixtures.defaultAnnotation()}
        annotationsService={fakeAnnotationsService}
        isReply={false}
        replyCount={0}
        threadIsCollapsed={true}
        {...props}
      />,
    );
  };

  beforeEach(() => {
    fakeAnnotationsService = {
      reply: sinon.stub(),
      save: sinon.stub().resolves(),
    };

    fakeAnnotationUser = {
      annotationDisplayName: sinon.stub().returns('Richard Lionheart'),
    };

    fakeMetadata = {
      annotationRole: sinon.stub().returns('Annotation'),
      quote: sinon.stub(),
    };

    fakeStore = {
      defaultAuthority: sinon.stub().returns('example.com'),
      getDraft: sinon.stub().returns(null),
      isAnnotationHovered: sinon.stub().returns(false),
      isFeatureEnabled: sinon
        .stub()
        .withArgs('client_display_names')
        .returns(true),
      isSavingAnnotation: sinon.stub().returns(false),
      profile: sinon.stub().returns({ userid: 'acct:foo@bar.com' }),
      setExpanded: sinon.stub(),
      isAnnotationHighlighted: sinon.stub().returns(false),
      focusedGroup: sinon.stub(),
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../../helpers/annotation-metadata': fakeMetadata,
      '../../helpers/annotation-user': fakeAnnotationUser,
      '../../store': { useSidebarStore: () => fakeStore },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  describe('annotation accessibility (ARIA) attributes', () => {
    it('should add a descriptive `aria-label` for an existing annotation', () => {
      const wrapper = createComponent();

      assert.equal(
        wrapper.find('article').props()['aria-label'],
        'Annotation by Richard Lionheart',
      );
    });

    it('should add a descriptive `aria-label` for a new annotation', () => {
      const wrapper = createComponent({ annotation: fixtures.newAnnotation() });

      assert.equal(
        wrapper.find('article').props()['aria-label'],
        'New annotation by Richard Lionheart',
      );
    });

    [true, false].forEach(isHighlighted => {
      it('should mention if annotation is highlighted', () => {
        fakeStore.isAnnotationHighlighted.returns(isHighlighted);
        const wrapper = createComponent();

        assert.equal(
          wrapper.find('article').prop('aria-label').endsWith(' - Highlighted'),
          isHighlighted,
        );
      });
    });
  });

  describe('annotation quote', () => {
    it('renders quote if annotation has a quote', () => {
      fakeMetadata.quote.returns('quote');
      const wrapper = createComponent();

      const quote = wrapper.find('AnnotationQuote');
      assert.isTrue(quote.exists());
    });

    it('sets the quote to hovered if annotation is currently hovered', () => {
      fakeStore.isAnnotationHovered.returns(true);
      fakeMetadata.quote.returns('quote');
      const wrapper = createComponent();

      assert.isTrue(wrapper.find('AnnotationQuote').props().isHovered);
    });

    it('does not render quote if annotation does not have a quote', () => {
      fakeMetadata.quote.returns(null);

      const wrapper = createComponent();

      const quote = wrapper.find('AnnotationQuote');
      assert.isFalse(quote.exists());
    });
  });

  describe('annotation thumbnail', () => {
    it('does not render a thumbnail if annotation has no shape selector', () => {
      const wrapper = createComponent();
      assert.isFalse(wrapper.exists('AnnotationThumbnail'));
    });

    it('renders a thumbnail if annotation has a shape selector', () => {
      const annotation = fixtures.defaultAnnotation();
      annotation.target[0].description = 'This is a thing';
      annotation.target[0].selector = [
        {
          type: 'ShapeSelector',
          shape: {
            type: 'rect',
            left: 0,
            top: 10,
            right: 10,
            bottom: 0,
          },
          text: 'Some text',
        },
      ];
      const wrapper = createComponent({ annotation });
      const thumbnail = wrapper.find('AnnotationThumbnail');
      assert.isTrue(thumbnail.exists());
      assert.equal(thumbnail.prop('tag'), annotation.$tag);
      assert.equal(thumbnail.prop('description'), 'This is a thing');
      assert.equal(thumbnail.prop('textInImage'), 'Some text');
      assert.equal(thumbnail.prop('showDescription'), true);
    });

    it('hides thumbnail description when editing', () => {
      setEditingMode(true);
      const annotation = fixtures.defaultAnnotation();
      annotation.target[0].description = 'This is a thing';
      annotation.target[0].selector = [
        {
          type: 'ShapeSelector',
          shape: {
            type: 'rect',
            left: 0,
            top: 10,
            right: 10,
            bottom: 0,
          },
          text: 'Some text',
        },
      ];
      const wrapper = createComponent({ annotation });
      const thumbnail = wrapper.find('AnnotationThumbnail');
      assert.isTrue(thumbnail.exists());
      assert.isFalse(thumbnail.prop('showDescription'));
    });
  });

  it('should show a "Saving" message when annotation is saving', () => {
    fakeStore.isSavingAnnotation.returns(true);

    const wrapper = createComponent();

    assert.include(
      wrapper.find('[data-testid="saving-message"]').text(),
      'Saving...',
    );
  });

  describe('reply thread toggle', () => {
    it('should render a toggle button if provided with a toggle callback', () => {
      const fakeOnToggleReplies = sinon.stub();
      const wrapper = createComponent({
        onToggleReplies: fakeOnToggleReplies,
        replyCount: 5,
        threadIsCollapsed: true,
      });

      const toggle = wrapper.find('AnnotationReplyToggle');

      assert.isTrue(toggle.exists());
      assert.equal(toggle.props().onToggleReplies, fakeOnToggleReplies);
      assert.equal(toggle.props().replyCount, 5);
      assert.equal(toggle.props().threadIsCollapsed, true);
    });

    it('should not render a reply toggle if no toggle callback provided', () => {
      const wrapper = createComponent({
        replyCount: 5,
        threadIsCollapsed: true,
      });

      assert.isFalse(wrapper.find('AnnotationReplyToggle').exists());
    });
  });

  describe('annotation actions', () => {
    describe('replying to an annotation', () => {
      it('should create a reply', () => {
        const theAnnot = fixtures.defaultAnnotation();
        const wrapper = createComponent({ annotation: theAnnot });

        wrapper.find('AnnotationActionBar').props().onReply();

        assert.calledOnce(fakeAnnotationsService.reply);
        assert.calledWith(
          fakeAnnotationsService.reply,
          theAnnot,
          'acct:foo@bar.com',
        );
      });
    });

    it('should show annotation actions', () => {
      const wrapper = createComponent();

      assert.isTrue(wrapper.find('AnnotationActionBar').exists());
    });

    it('should not show annotation actions when editing', () => {
      setEditingMode(true);

      const wrapper = createComponent();

      assert.isFalse(wrapper.find('AnnotationActionBar').exists());
    });
  });

  context('annotation thread is collapsed', () => {
    context('collapsed reply', () => {
      it('should not render body or footer', () => {
        const wrapper = createComponent({
          isReply: true,
          threadIsCollapsed: true,
        });

        assert.isFalse(wrapper.find('AnnotationBody').exists());
        assert.isFalse(wrapper.find('footer').exists());
      });

      it('should not show actions', () => {
        const wrapper = createComponent({
          isReply: true,
          threadIsCollapsed: true,
        });

        assert.isFalse(wrapper.find('AnnotationActionBar').exists());
      });
    });

    context('collapsed top-level annotation', () => {
      it('should render body and footer', () => {
        const wrapper = createComponent({
          isReply: false,
          threadIsCollapsed: true,
        });

        assert.isTrue(wrapper.find('AnnotationBody').exists());
        assert.isTrue(wrapper.find('footer').exists());
      });
    });
  });

  [true, false].forEach(showActions => {
    it('renders ModerationControl when actions are shown', () => {
      fakeStore.isSavingAnnotation.returns(!showActions);

      const wrapper = createComponent({
        annotation: fixtures.defaultAnnotation(),
      });

      assert.equal(wrapper.exists('ModerationControl'), showActions);
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility([
      {
        content: () => createComponent(),
      },
      {
        name: 'When editing',
        content: () => {
          setEditingMode(true);
          return createComponent();
        },
      },
      {
        name: 'when a collapsed top-level thread',
        content: () => {
          return createComponent({ isReply: false, threadIsCollapsed: true });
        },
      },
      {
        name: 'when a collapsed reply',
        content: () => {
          return createComponent({ isReply: true, threadIsCollapsed: true });
        },
      },
    ]),
  );
});
