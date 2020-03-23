import { mount } from 'enzyme';
import { createElement } from 'preact';
import { act } from 'preact/test-utils';

import * as fixtures from '../../test/annotation-fixtures';

import { checkAccessibility } from '../../../test-util/accessibility';
import mockImportedComponents from '../../../test-util/mock-imported-components';
import { waitFor } from '../../../test-util/wait';

// @TODO Note this import as `Annotation` for easier updating later

import Annotation from '../annotation-omega';
import { $imports } from '../annotation-omega';

describe('AnnotationOmega', () => {
  let fakeOnReplyCountClick;

  // Dependency Mocks
  let fakeMetadata;
  let fakePermissions;

  // Injected dependency mocks
  let fakeAnnotationsService;
  let fakeFlash;
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
        flash={fakeFlash}
        onReplyCountClick={fakeOnReplyCountClick}
        replyCount={0}
        showDocumentInfo={false}
        threadIsCollapsed={true}
        {...props}
      />
    );
  };

  beforeEach(() => {
    fakeOnReplyCountClick = sinon.stub();

    fakeAnnotationsService = {
      reply: sinon.stub(),
      save: sinon.stub().resolves(),
    };

    fakeFlash = {
      error: sinon.stub(),
    };

    fakeMetadata = {
      isNew: sinon.stub(),
      isReply: sinon.stub(),
      quote: sinon.stub(),
    };

    fakePermissions = {
      isShared: sinon.stub().returns(true),
    };

    fakeStore = {
      createDraft: sinon.stub(),
      getDraft: sinon.stub().returns(null),
      getGroup: sinon.stub().returns({
        type: 'private',
      }),
      profile: sinon.stub().returns({ userid: 'acct:foo@bar.com' }),
      setCollapsed: sinon.stub(),
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../util/annotation-metadata': fakeMetadata,
      '../util/permissions': fakePermissions,
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

    it('does not render quote if annotation does not have a quote', () => {
      fakeMetadata.quote.returns(null);

      const wrapper = createComponent();

      const quote = wrapper.find('AnnotationQuote');
      assert.isFalse(quote.exists());
    });
  });

  describe('annotation body and excerpt', () => {
    it('updates annotation draft when text edited', () => {
      const wrapper = createComponent();
      const body = wrapper.find('AnnotationBody');

      act(() => {
        body.props().onEditText({ text: 'updated text' });
      });

      const call = fakeStore.createDraft.getCall(0);
      assert.calledOnce(fakeStore.createDraft);
      assert.equal(call.args[1].text, 'updated text');
    });
  });

  describe('tags', () => {
    it('renders tag editor if `isEditing', () => {
      setEditingMode(true);

      const wrapper = createComponent();

      assert.isTrue(wrapper.find('TagEditor').exists());
      assert.isFalse(wrapper.find('TagList').exists());
    });

    it('updates annotation draft if tags changed', () => {
      setEditingMode(true);
      const wrapper = createComponent();

      wrapper
        .find('TagEditor')
        .props()
        .onEditTags({ tags: ['uno', 'dos'] });

      const call = fakeStore.createDraft.getCall(0);
      assert.calledOnce(fakeStore.createDraft);
      assert.sameMembers(call.args[1].tags, ['uno', 'dos']);
    });

    it('renders tag list if not `isEditing', () => {
      const wrapper = createComponent();

      assert.isTrue(wrapper.find('TagList').exists());
      assert.isFalse(wrapper.find('TagEditor').exists());
    });
  });

  describe('publish control', () => {
    it('should show the publish control if in edit mode', () => {
      setEditingMode(true);

      const wrapper = createComponent();

      assert.isTrue(wrapper.find('AnnotationPublishControl').exists());
    });

    it('should not show the publish control if not in edit mode', () => {
      setEditingMode(false);

      const wrapper = createComponent();

      assert.isFalse(wrapper.find('AnnotationPublishControl').exists());
    });

    it('should enable the publish control if the annotation is not empty', () => {
      const draft = fixtures.defaultDraft();
      draft.text = 'bananas';
      fakeStore.getDraft.returns(draft);

      const wrapper = createComponent();

      assert.isFalse(
        wrapper.find('AnnotationPublishControl').props().isDisabled
      );
    });

    it('should set the publish control to disabled if annotation is empty', () => {
      const draft = fixtures.defaultDraft();
      draft.tags = [];
      draft.text = '';
      fakeStore.getDraft.returns(draft);

      const wrapper = createComponent();

      assert.isTrue(
        wrapper.find('AnnotationPublishControl').props().isDisabled
      );
    });

    context('saving an annotation', () => {
      it('should save the annotation when the publish control invokes the `onSave` callback', () => {
        setEditingMode(true);

        const wrapper = createComponent();
        wrapper
          .find('AnnotationPublishControl')
          .props()
          .onSave();

        assert.calledWith(
          fakeAnnotationsService.save,
          wrapper.props().annotation
        );
      });

      it('should show a "Saving" message when annotation is saving', () => {
        setEditingMode(true);

        const wrapper = createComponent();
        act(() => {
          wrapper
            .find('AnnotationPublishControl')
            .props()
            .onSave();
        });

        wrapper.update();

        assert.include(
          wrapper.find('.annotation__actions').text(),
          'Saving...'
        );
      });

      it('should flash an error message on failure', async () => {
        setEditingMode(true);
        fakeAnnotationsService.save.rejects();

        const wrapper = createComponent();
        wrapper
          .find('AnnotationPublishControl')
          .props()
          .onSave();

        await waitFor(() => fakeFlash.error.called);
      });

      describe('saving using shortcut-key combo', () => {
        context('in editing mode with text or tag content populated', () => {
          beforeEach(() => {
            // Put into editing mode by presence of draft, and add some `text`
            // so that the annotation is not seen as "empty"
            const draft = fixtures.defaultDraft();
            draft.text = 'bananas';
            fakeStore.getDraft.returns(draft);
          });

          it('should save annotation if `CTRL+Enter` is typed', () => {
            const wrapper = createComponent();

            wrapper
              .find('.annotation')
              .simulate('keydown', { key: 'Enter', ctrlKey: true });

            assert.calledWith(
              fakeAnnotationsService.save,
              wrapper.props().annotation
            );
          });

          it('should save annotation if `META+Enter` is typed', () => {
            const wrapper = createComponent();

            wrapper
              .find('.annotation')
              .simulate('keydown', { key: 'Enter', metaKey: true });

            assert.calledWith(
              fakeAnnotationsService.save,
              wrapper.props().annotation
            );
          });

          it('should not save annotation if `META+g` is typed', () => {
            // i.e. don't save on non-"Enter" keys
            const wrapper = createComponent();

            wrapper
              .find('.annotation')
              .simulate('keydown', { key: 'g', metaKey: true });

            assert.notCalled(fakeAnnotationsService.save);
          });
        });

        context('empty or not in editing mode', () => {
          it('should not save annotation if not in editing mode', () => {
            fakeStore.getDraft.returns(null);
            const wrapper = createComponent();

            wrapper
              .find('.annotation')
              .simulate('keydown', { key: 'Enter', metaKey: true });

            assert.notCalled(fakeAnnotationsService.save);
          });

          it('should not save annotation if content is empty', () => {
            fakeStore.getDraft.returns(fixtures.defaultDraft());
            const wrapper = createComponent();

            wrapper
              .find('.annotation')
              .simulate('keydown', { key: 'Enter', ctrlKey: true });

            assert.notCalled(fakeAnnotationsService.save);
          });
        });
      });
    });
  });

  describe('license information', () => {
    it('should show license information when editing shared annotations in public groups', () => {
      fakeStore.getGroup.returns({ type: 'open' });
      setEditingMode(true);

      const wrapper = createComponent();

      assert.isTrue(wrapper.find('AnnotationLicense').exists());
    });

    it('should not show license information when not editing', () => {
      fakeStore.getGroup.returns({ type: 'open' });
      setEditingMode(false);

      const wrapper = createComponent();

      assert.isFalse(wrapper.find('AnnotationLicense').exists());
    });

    it('should not show license information for annotations in private groups', () => {
      fakeStore.getGroup.returns({ type: 'private' });
      setEditingMode(true);

      const wrapper = createComponent();

      assert.isFalse(wrapper.find('AnnotationLicense').exists());
    });

    it('should not show license information for private annotations', () => {
      const draft = fixtures.defaultDraft();
      draft.isPrivate = true;
      fakeStore.getGroup.returns({ type: 'open' });
      fakeStore.getDraft.returns(draft);

      const wrapper = createComponent();

      assert.isFalse(wrapper.find('AnnotationLicense').exists());
    });
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
        findRepliesButton(wrapper)
          .props()
          .onClick();
      });
      wrapper.setProps({ threadIsCollapsed: false });

      assert.calledOnce(fakeStore.setCollapsed);
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

        wrapper
          .find('AnnotationActionBar')
          .props()
          .onReply();

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

    it('should not show annotation actions for new annotation', () => {
      fakeMetadata.isNew.returns(true);

      const wrapper = createComponent();

      assert.isFalse(wrapper.find('AnnotationActionBar').exists());
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
      ])
    );
  });
});
