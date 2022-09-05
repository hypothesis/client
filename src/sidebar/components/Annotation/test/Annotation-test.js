import { mount } from 'enzyme';

import * as fixtures from '../../../test/annotation-fixtures';

import { checkAccessibility } from '../../../../test-util/accessibility';
import { mockImportedComponents } from '../../../../test-util/mock-imported-components';

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
      />
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
        'Annotation by Richard Lionheart'
      );
    });

    it('should add a descriptive `aria-label` for a new annotation', () => {
      const wrapper = createComponent({ annotation: fixtures.newAnnotation() });

      assert.equal(
        wrapper.find('article').props()['aria-label'],
        'New annotation by Richard Lionheart'
      );
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

  it('should show a "Saving" message when annotation is saving', () => {
    fakeStore.isSavingAnnotation.returns(true);

    const wrapper = createComponent();

    assert.include(
      wrapper.find('[data-testid="saving-message"]').text(),
      'Saving...'
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
          'acct:foo@bar.com'
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
    ])
  );
});
