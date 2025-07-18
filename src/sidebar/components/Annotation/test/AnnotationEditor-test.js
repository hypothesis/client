import {
  checkAccessibility,
  mockImportedComponents,
  waitFor,
} from '@hypothesis/frontend-testing';
import { mount } from '@hypothesis/frontend-testing';
import { act } from 'preact/test-utils';
import sinon from 'sinon';

import * as fixtures from '../../../test/annotation-fixtures';
import AnnotationEditor, { $imports } from '../AnnotationEditor';

describe('AnnotationEditor', () => {
  let fakeApplyTheme;
  let fakeAnnotationsService;
  let fakeGroup;
  let fakeTagsService;
  let fakeSettings;
  let fakeToastMessenger;
  let fakeGroupsService;
  let fakeUseUnsavedChanges;

  let fakeStore;

  const editorSelector = '[data-testid="annotation-editor"]';

  function createComponent(props = {}) {
    return mount(
      <AnnotationEditor
        annotation={fixtures.defaultAnnotation()}
        draft={fixtures.defaultDraft()}
        annotationsService={fakeAnnotationsService}
        settings={fakeSettings}
        tags={fakeTagsService}
        toastMessenger={fakeToastMessenger}
        groups={fakeGroupsService}
        {...props}
      />,
    );
  }

  beforeEach(() => {
    fakeApplyTheme = sinon.stub();
    fakeAnnotationsService = {
      save: sinon.stub(),
    };

    fakeGroup = {
      name: 'Fake Group',
      type: 'private',
    };

    fakeSettings = {};
    fakeTagsService = {
      store: sinon.stub(),
    };
    fakeToastMessenger = {
      error: sinon.stub(),
      success: sinon.stub(),
    };
    fakeGroupsService = {
      loadFocusedGroupMembers: sinon.stub().resolves(undefined),
    };

    fakeStore = {
      createDraft: sinon.stub(),
      getGroup: sinon.stub().returns(fakeGroup),
      setDefault: sinon.stub(),
      removeDraft: sinon.stub(),
      removeAnnotations: sinon.stub(),
      isFeatureEnabled: sinon.stub().returns(false),
      usersWhoAnnotated: sinon.stub().returns([]),
      usersWhoWereMentioned: sinon.stub().returns([]),
      getFocusedGroupMembers: sinon.stub().returns({ status: 'not-loaded' }),
      defaultAuthority: sinon.stub().returns(''),
    };

    fakeUseUnsavedChanges = sinon.stub();

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../hooks/unsaved-changes': {
        useUnsavedChanges: fakeUseUnsavedChanges,
      },
      '../../store': { useSidebarStore: () => fakeStore },
      '../../helpers/theme': { applyTheme: fakeApplyTheme },
    });
    // `AnnotationLicense` is a presentation-only component and is only used
    // within `AnnotationEditor`. Not mocking it allows it to be exercised and
    // meet code coverage.
    $imports.$restore({
      './AnnotationLicense': true,
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  describe('editing text content', () => {
    it('applies theme', () => {
      const textStyle = { fontFamily: 'serif' };
      fakeApplyTheme
        .withArgs(['annotationFontFamily'], fakeSettings)
        .returns(textStyle);

      const wrapper = createComponent();
      assert.deepEqual(
        wrapper.find('MarkdownEditor').prop('textStyle'),
        textStyle,
      );
    });

    it('updates draft text on edit callback', () => {
      const wrapper = createComponent();
      const editor = wrapper.find('MarkdownEditor');

      act(() => {
        editor.props().onEditText('updated text');
      });

      const call = fakeStore.createDraft.getCall(0);
      assert.calledOnce(fakeStore.createDraft);
      assert.equal(call.args[1].text, 'updated text');
    });

    [
      { annotation: fixtures.newReply(), expectedLabel: 'Enter reply' },
      {
        annotation: fixtures.defaultAnnotation(),
        expectedLabel: 'Enter comment',
      },
    ].forEach(({ annotation, expectedLabel }) => {
      it('sets proper label', () => {
        const wrapper = createComponent({ annotation });
        const editor = wrapper.find('MarkdownEditor');

        assert.equal(editor.prop('label'), expectedLabel);
      });
    });
  });

  describe('editing tags', () => {
    it('adds tag when add callback invoked', () => {
      const wrapper = createComponent();
      wrapper.find('TagEditor').props().onAddTag('newTag');

      const storeCall = fakeTagsService.store.getCall(0);
      const draftCall = fakeStore.createDraft.getCall(0);

      assert.deepEqual(storeCall.args[0], ['newTag']);
      assert.deepEqual(draftCall.args[1].tags, ['newTag']);
    });

    it('does not add duplicate tags', () => {
      const draft = fixtures.defaultDraft();
      draft.tags = ['newTag'];

      const wrapper = createComponent({ draft });
      wrapper.find('TagEditor').props().onAddTag('newTag');

      assert.equal(fakeTagsService.store.callCount, 0);
      assert.equal(fakeStore.createDraft.callCount, 0);
    });

    it('removes tag when remove callback invoked', () => {
      const draft = fixtures.defaultDraft();
      draft.tags = ['newTag'];

      const wrapper = createComponent({ draft });
      wrapper.find('TagEditor').props().onRemoveTag('newTag');

      const draftCall = fakeStore.createDraft.getCall(0);

      assert.equal(fakeTagsService.store.callCount, 0);
      assert.deepEqual(draftCall.args[1].tags, []);
    });

    it('does not remove non-existent tags', () => {
      const draft = fixtures.defaultDraft();

      const wrapper = createComponent({ draft });
      wrapper.find('TagEditor').props().onRemoveTag('newTag');

      assert.equal(fakeTagsService.store.callCount, 0);
      assert.equal(fakeStore.createDraft.callCount, 0);
    });
  });

  describe('editing target descriptions', () => {
    const getDescription = wrapper => wrapper.find('ThumbnailDescriptionInput');

    beforeEach(() => {
      fakeStore.isFeatureEnabled.withArgs('image_descriptions').returns(true);
    });

    it('does not show description input if annotation has no shape selector', () => {
      const wrapper = createComponent();
      assert.isFalse(getDescription(wrapper).exists());
    });

    it('updates draft when description is edited', () => {
      const annotation = Object.assign(fixtures.defaultAnnotation(), {
        target: [
          {
            selector: [{ type: 'ShapeSelector' }],
          },
        ],
      });
      const wrapper = createComponent({ annotation });
      wrapper.find('ThumbnailDescriptionInput').prop('onEdit')(
        'new-description',
      );

      const draftCall = fakeStore.createDraft.getCall(0);

      assert.deepEqual(draftCall.args[1].description, 'new-description');
    });
  });

  describe('saving the annotation', () => {
    it('saves the annotation when save callback invoked', async () => {
      const annotation = fixtures.defaultAnnotation();
      const wrapper = createComponent({ annotation });

      await wrapper.find('AnnotationPublishControl').props().onSave();

      assert.calledOnce(fakeAnnotationsService.save);
      assert.calledWith(fakeAnnotationsService.save, annotation);
    });

    it('shows a visually-hidden toast message on success', async () => {
      const annotation = fixtures.defaultAnnotation();
      const wrapper = createComponent({ annotation });

      await wrapper.find('AnnotationPublishControl').props().onSave();

      await waitFor(() => fakeToastMessenger.success.called);
      // The defaultAnnotation() fixture evaluates as a previously-saved
      // highlight because it lacks selectors
      assert.calledWith(fakeToastMessenger.success, 'Highlight updated', {
        visuallyHidden: true,
      });
    });

    it('checks for unsaved tags on save', async () => {
      const wrapper = createComponent();
      // Simulate "typing in" some tag text into the tag editor
      wrapper.find('TagEditor').props().onTagInput('foobar');
      wrapper.update();

      await act(
        async () =>
          await wrapper.find('AnnotationPublishControl').props().onSave(),
      );

      const draftCall = fakeStore.createDraft.getCall(0);
      assert.equal(fakeTagsService.store.callCount, 1);
      assert.equal(fakeStore.createDraft.callCount, 1);
      assert.deepEqual(draftCall.args[1].tags, ['foobar']);
    });

    it('shows a toast message on error', async () => {
      fakeAnnotationsService.save.throws();

      const wrapper = createComponent();

      fakeAnnotationsService.save.rejects();

      wrapper.find('AnnotationPublishControl').props().onSave();

      await waitFor(() => fakeToastMessenger.error.called);
    });

    it('should save annotation if `CTRL+Enter` is typed', () => {
      const draft = fixtures.defaultDraft();
      // Need some content so that it won't evaluate as "empty" and not save
      draft.text = 'something is here';
      const wrapper = createComponent({ draft });

      wrapper
        .find(editorSelector)
        .simulate('keydown', { key: 'Enter', ctrlKey: true });

      assert.calledOnce(fakeAnnotationsService.save);
      assert.calledWith(
        fakeAnnotationsService.save,
        wrapper.props().annotation,
      );
    });

    it('should save annotation if `META+Enter` is typed', () => {
      const draft = fixtures.defaultDraft();
      // Need some content so that it won't evaluate as "empty" and not save
      draft.text = 'something is here';
      const wrapper = createComponent({ draft });

      wrapper
        .find(editorSelector)
        .simulate('keydown', { key: 'Enter', metaKey: true });

      assert.calledOnce(fakeAnnotationsService.save);
      assert.calledWith(
        fakeAnnotationsService.save,
        wrapper.props().annotation,
      );
    });

    it('should not save annotation if `META+Enter` is typed but annotation empty', () => {
      const wrapper = createComponent();

      wrapper
        .find(editorSelector)
        .simulate('keydown', { key: 'Enter', metaKey: true });

      assert.notCalled(fakeAnnotationsService.save);
    });

    it('warns if user closes tab while there is a non-empty draft', () => {
      // If the draft is empty, the warning is disabled.
      const wrapper = createComponent();
      assert.calledWith(fakeUseUnsavedChanges, false);

      // If the draft changes to non-empty, the warning is enabled.
      fakeUseUnsavedChanges.resetHistory();
      const draft = fixtures.defaultDraft();
      draft.text = 'something is here';
      wrapper.setProps({ draft });
      assert.calledWith(fakeUseUnsavedChanges, true);
    });

    describe('handling publish options', () => {
      it('sets the publish control to disabled if the annotation is empty', () => {
        // default draft has no tags or text
        const wrapper = createComponent();

        assert.isTrue(
          wrapper.find('AnnotationPublishControl').props().isDisabled,
        );
      });

      it('enables the publish control when annotation has content', () => {
        const draft = fixtures.defaultDraft();
        draft.text = 'something is here';
        const wrapper = createComponent({ draft });

        assert.isFalse(
          wrapper.find('AnnotationPublishControl').props().isDisabled,
        );
      });

      context('privacy changed in publish control', () => {
        it("updates the draft's privacy when set to private", () => {
          const draft = fixtures.defaultDraft();
          draft.isPrivate = false;
          const wrapper = createComponent({ draft });

          wrapper.find('AnnotationPublishControl').props().onSetPrivate(true);

          const call = fakeStore.createDraft.getCall(0);

          assert.calledOnce(fakeStore.createDraft);
          assert.isTrue(call.args[1].isPrivate);
        });

        it("updates the draft's privacy when set to shared", () => {
          const wrapper = createComponent();

          wrapper.find('AnnotationPublishControl').props().onSetPrivate(false);

          const call = fakeStore.createDraft.getCall(0);

          assert.calledOnce(fakeStore.createDraft);
          assert.isFalse(call.args[1].isPrivate);
        });

        it('updates privacy default setting', () => {
          const wrapper = createComponent();

          wrapper.find('AnnotationPublishControl').props().onSetPrivate(false);

          assert.calledOnce(fakeStore.setDefault);
          assert.calledWith(
            fakeStore.setDefault,
            'annotationPrivacy',
            'shared',
          );
        });

        it('does not update privacy default if annotation is a reply', () => {
          const wrapper = createComponent({ annotation: fixtures.newReply() });

          wrapper.find('AnnotationPublishControl').props().onSetPrivate(false);

          assert.notCalled(fakeStore.setDefault);
        });
      });
    });
  });

  context('exiting edit mode', () => {
    it('removes the current draft when canceled', () => {
      const wrapper = createComponent();

      wrapper.find('AnnotationPublishControl').props().onCancel();

      assert.calledOnce(fakeStore.removeDraft);
      assert.calledWith(fakeStore.removeDraft, wrapper.props().annotation);
      assert.equal(fakeStore.removeAnnotations.callCount, 0);
    });

    it('removes annotation from store if it is an unsaved annotation', () => {
      const wrapper = createComponent({ annotation: fixtures.newAnnotation() });

      wrapper.find('AnnotationPublishControl').props().onCancel();

      assert.calledOnce(fakeStore.removeDraft);
      assert.calledOnce(fakeStore.removeAnnotations);
    });
  });

  it('shows license info if annotation is shared and in a public group', () => {
    fakeStore.getGroup.returns({ type: 'open' });

    const wrapper = createComponent();

    assert.isTrue(wrapper.find('AnnotationLicense').exists());
  });

  it('does not show license info if annotation is only-me', () => {
    const draft = fixtures.defaultDraft();
    draft.isPrivate = true;
    fakeStore.getGroup.returns({ type: 'open' });

    const wrapper = createComponent({ draft });

    assert.isFalse(wrapper.find('AnnotationLicense').exists());
  });

  it('does not show license if annotation is in a private group', () => {
    fakeStore.getGroup.returns({ type: 'private' });

    const wrapper = createComponent();

    assert.isFalse(wrapper.find('AnnotationLicense').exists());
  });

  [true, false].forEach(enableHelpPanel => {
    it('hides help links if Help panel is disabled', () => {
      fakeSettings = {
        services: [
          {
            enableHelpPanel,
          },
        ],
      };

      const wrapper = createComponent();

      assert.equal(
        wrapper.find('MarkdownEditor').prop('showHelpLink'),
        enableHelpPanel,
      );
    });
  });

  describe('loading focused group members', () => {
    [
      {
        mentionsEnabled: true,
        focusedGroupMembers: { status: 'not-loaded' },
        shouldLoadMembers: true,
      },
      {
        mentionsEnabled: false,
        focusedGroupMembers: { status: 'not-loaded' },
        shouldLoadMembers: false,
      },
      {
        mentionsEnabled: true,
        focusedGroupMembers: { status: 'loaded', members: [] },
        shouldLoadMembers: false,
      },
      {
        mentionsEnabled: true,
        focusedGroupMembers: { status: 'loading' },
        shouldLoadMembers: false,
      },
    ].forEach(({ mentionsEnabled, focusedGroupMembers, shouldLoadMembers }) => {
      it('loads focused group members when mounted', () => {
        fakeStore.isFeatureEnabled.returns(mentionsEnabled);
        fakeStore.getFocusedGroupMembers.returns(focusedGroupMembers);

        createComponent();

        assert.equal(
          fakeGroupsService.loadFocusedGroupMembers.called,
          shouldLoadMembers,
        );
      });
    });
  });

  [
    {
      defaultAuthority: 'example.com',
      expectedMentionMode: 'username',
    },
    {
      defaultAuthority: 'foo.com',
      expectedMentionMode: 'display-name',
    },
  ].forEach(({ defaultAuthority, expectedMentionMode }) => {
    it('sets expected mention mode based on annotation author', () => {
      fakeStore.defaultAuthority.returns(defaultAuthority);

      const wrapper = createComponent({
        annotation: {
          ...fixtures.defaultAnnotation(),
          user: 'acct:username@example.com',
        },
      });

      assert.equal(
        wrapper.find('MarkdownEditor').prop('mentionMode'),
        expectedMentionMode,
      );
    });
  });

  function insertMentionSuggestion(wrapper, user) {
    wrapper.find('MarkdownEditor').props().onInsertMentionSuggestion(user);
  }

  context('when annotation author is a third party user', () => {
    it('initializes display names map with annotation mentions', () => {
      const mentions = [
        {
          userid: 'acct:ignored@example.com',
        },
        {
          userid: 'acct:foo@example.com',
          display_name: 'Foo',
          username: 'foo',
        },
        {
          userid: 'acct:bar@example.com',
          display_name: 'Bar',
          username: 'bar',
        },
      ];
      const annotation = {
        ...fixtures.defaultAnnotation(),
        mentions,
        user: 'acct:username@example.com', // Third party user
      };
      const wrapper = createComponent({ annotation });

      wrapper.find('AnnotationPublishControl').props().onSave();

      assert.calledWith(
        fakeAnnotationsService.save,
        annotation,
        sinon.match({
          mentionMode: 'display-name',
          usersMap: new Map([
            [
              'Foo',
              {
                userid: 'acct:foo@example.com',
                displayName: 'Foo',
                username: 'foo',
              },
            ],
            [
              'Bar',
              {
                userid: 'acct:bar@example.com',
                displayName: 'Bar',
                username: 'bar',
              },
            ],
          ]),
        }),
      );
    });

    it('tracks user info for inserted mention suggestions', () => {
      const annotation = {
        ...fixtures.defaultAnnotation(),
        mentions: [],
        user: 'acct:username@example.com', // Third party user
      };
      const wrapper = createComponent({ annotation });

      insertMentionSuggestion(wrapper, {
        userid: 'acct:jane_doe@example.com',
        displayName: 'Jane Doe',
        username: 'jane_doe',
      });
      insertMentionSuggestion(wrapper, {
        userid: 'acct:johndoe@example.com',
        displayName: 'John Doe',
        username: 'johndoe',
      });

      // Users without displayName are ignored
      insertMentionSuggestion(wrapper, {
        userid: 'acct:ignored@example.com',
        username: 'ignored',
      });

      wrapper.find('AnnotationPublishControl').props().onSave();

      assert.calledWith(
        fakeAnnotationsService.save,
        annotation,
        sinon.match({
          mentionMode: 'display-name',
          usersMap: new Map([
            [
              'Jane Doe',
              {
                userid: 'acct:jane_doe@example.com',
                displayName: 'Jane Doe',
                username: 'jane_doe',
              },
            ],
            [
              'John Doe',
              {
                userid: 'acct:johndoe@example.com',
                displayName: 'John Doe',
                username: 'johndoe',
              },
            ],
          ]),
        }),
      );
    });
  });

  context('when annotation author is a first party user', () => {
    it('does not track user info for inserted suggestions', () => {
      fakeStore.defaultAuthority.returns('hypothes.is');

      const annotation = {
        ...fixtures.defaultAnnotation(),
        mentions: [],
        user: 'acct:username@hypothes.is', // First party user
      };
      const wrapper = createComponent({ annotation });

      insertMentionSuggestion(wrapper, {
        userid: 'acct:jane_doe@example.com',
        displayName: 'Jane Doe',
        username: 'jane_doe',
      });
      insertMentionSuggestion(wrapper, {
        userid: 'acct:johndoe@example.com',
        displayName: 'John Doe',
        username: 'johndoe',
      });

      wrapper.find('AnnotationPublishControl').props().onSave();

      assert.calledWith(
        fakeAnnotationsService.save,
        annotation,
        sinon.match({ mentionMode: 'username' }),
      );
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility([
      {
        // AnnotationEditor is primarily a container and state-managing component;
        // a11y should be more deeply checked on the leaf components
        content: () => createComponent(),
      },
    ]),
  );
});
