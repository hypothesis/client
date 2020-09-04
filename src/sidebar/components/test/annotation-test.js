import { mount } from 'enzyme';
import { createElement } from 'preact';
import { act } from 'preact/test-utils';

import * as fixtures from '../../test/annotation-fixtures';

import { checkAccessibility } from '../../../test-util/accessibility';
import mockImportedComponents from '../../../test-util/mock-imported-components';

import Annotation from '../annotation';
import { $imports } from '../annotation';

describe('Annotation', () => {
  // Dependency Mocks
  let fakeMetadata;

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
        replyCount={0}
        showDocumentInfo={false}
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

    fakeMetadata = {
      isReply: sinon.stub(),
      quote: sinon.stub(),
    };

    fakeStore = {
      getDraft: sinon.stub().returns(null),
      isAnnotationFocused: sinon.stub().returns(false),
      isSavingAnnotation: sinon.stub().returns(false),
      profile: sinon.stub().returns({ userid: 'acct:foo@bar.com' }),
      setExpanded: sinon.stub(),
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../util/annotation-metadata': fakeMetadata,
      '../store/use-store': callback => callback(fakeStore),
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  describe('annotation classnames', () => {
    it('should assign a reply class if the annotation is a reply', () => {
      fakeMetadata.isReply.returns(true);

      const wrapper = createComponent({ threadIsCollapsed: false });
      const annot = wrapper.find('.annotation');

      assert.isTrue(annot.hasClass('annotation--reply'));
      assert.isFalse(annot.hasClass('is-collapsed'));
    });

    it('applies a focused class if annotation is focused', () => {
      fakeStore.isAnnotationFocused.returns(true);
      const wrapper = createComponent({ threadIsCollapsed: false });
      const annot = wrapper.find('.annotation');

      assert.isTrue(annot.hasClass('is-focused'));
    });

    it('should assign a collapsed class if the annotation thread is collapsed', () => {
      const wrapper = createComponent({ threadIsCollapsed: true });
      const annot = wrapper.find('.annotation');

      assert.isTrue(annot.hasClass('is-collapsed'));
    });
  });

  describe('annotation quote', () => {
    it('renders quote if annotation has a quote', () => {
      fakeMetadata.quote.returns('quote');
      const wrapper = createComponent();

      const quote = wrapper.find('AnnotationQuote');
      assert.isTrue(quote.exists());
    });

    it('sets the quote to "focused" if annotation is currently focused', () => {
      fakeStore.isAnnotationFocused.returns(true);
      fakeMetadata.quote.returns('quote');
      const wrapper = createComponent();

      assert.isTrue(wrapper.find('AnnotationQuote').props().isFocused);
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

    assert.include(wrapper.find('.annotation__actions').text(), 'Saving...');
  });

  describe('reply thread toggle button', () => {
    const findRepliesButton = wrapper =>
      wrapper.find('Button').filter('.annotation__reply-toggle');

    it('should render a toggle button if the annotation has replies', () => {
      fakeMetadata.isReply.returns(false);
      const wrapper = createComponent({
        replyCount: 5,
        threadIsCollapsed: true,
      });

      assert.isTrue(findRepliesButton(wrapper).exists());
      assert.equal(
        findRepliesButton(wrapper).props().buttonText,
        'Show replies (5)'
      );
    });

    it('should not render a toggle button if the annotation has no replies', () => {
      fakeMetadata.isReply.returns(false);
      const wrapper = createComponent({
        replyCount: 0,
        threadIsCollapsed: true,
      });

      assert.isFalse(findRepliesButton(wrapper).exists());
    });

    it('should not render a toggle button if the annotation itself is a reply', () => {
      fakeMetadata.isReply.returns(true);
      const wrapper = createComponent({
        replyCount: 5,
        threadIsCollapsed: true,
      });

      assert.isFalse(findRepliesButton(wrapper).exists());
    });

    it('should toggle the collapsed state of the thread on click', () => {
      fakeMetadata.isReply.returns(false);
      const wrapper = createComponent({
        replyCount: 5,
        threadIsCollapsed: true,
      });

      act(() => {
        findRepliesButton(wrapper).props().onClick();
      });
      wrapper.setProps({ threadIsCollapsed: false });

      assert.calledOnce(fakeStore.setExpanded);
      assert.equal(
        findRepliesButton(wrapper).props().buttonText,
        'Hide replies (5)'
      );
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
      beforeEach(() => {
        fakeMetadata.isReply.returns(true);
      });

      it('should not render body or footer', () => {
        const wrapper = createComponent({ threadIsCollapsed: true });

        assert.isFalse(wrapper.find('AnnotationBody').exists());
        assert.isFalse(wrapper.find('footer').exists());
      });

      it('should not show actions', () => {
        const wrapper = createComponent({ threadIsCollapsed: true });

        assert.isFalse(wrapper.find('AnnotationActionBar').exists());
      });
    });

    context('collapsed top-level annotation', () => {
      it('should render body and footer', () => {
        fakeMetadata.isReply.returns(false);
        const wrapper = createComponent({ threadIsCollapsed: true });

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
          fakeMetadata.isReply.returns(false);
          return createComponent({ threadIsCollapsed: true });
        },
      },
      {
        name: 'when a collapsed reply',
        content: () => {
          fakeMetadata.isReply.returns(true);
          return createComponent({ threadIsCollapsed: true });
        },
      },
    ])
  );
});
