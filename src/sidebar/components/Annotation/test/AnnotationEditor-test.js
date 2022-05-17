import { mount } from 'enzyme';
import { act } from 'preact/test-utils';

import * as fixtures from '../../../test/annotation-fixtures';
import { waitFor } from '../../../../test-util/wait';

import { checkAccessibility } from '../../../../test-util/accessibility';
import { mockImportedComponents } from '../../../../test-util/mock-imported-components';

import AnnotationEditor, { $imports } from '../AnnotationEditor';

describe('AnnotationEditor', () => {
  let fakeApplyTheme;
  let fakeAnnotationsService;
  let fakeGroup;
  let fakeTagsService;
  let fakeSettings;
  let fakeToastMessenger;

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
        {...props}
      />
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

    fakeStore = {
      createDraft: sinon.stub(),
      getGroup: sinon.stub().returns(fakeGroup),
      setDefault: sinon.stub(),
      removeDraft: sinon.stub(),
      removeAnnotations: sinon.stub(),
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
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
        textStyle
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
          await wrapper.find('AnnotationPublishControl').props().onSave()
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
        wrapper.props().annotation
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
        wrapper.props().annotation
      );
    });

    it('should not save annotation if `META+Enter` is typed but annotation empty', () => {
      const wrapper = createComponent();

      wrapper
        .find(editorSelector)
        .simulate('keydown', { key: 'Enter', metaKey: true });

      assert.notCalled(fakeAnnotationsService.save);
    });

    describe('handling publish options', () => {
      it('sets the publish control to disabled if the annotation is empty', () => {
        // default draft has no tags or text
        const wrapper = createComponent();

        assert.isTrue(
          wrapper.find('AnnotationPublishControl').props().isDisabled
        );
      });

      it('enables the publish control when annotation has content', () => {
        const draft = fixtures.defaultDraft();
        draft.text = 'something is here';
        const wrapper = createComponent({ draft });

        assert.isFalse(
          wrapper.find('AnnotationPublishControl').props().isDisabled
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
            'shared'
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

  it(
    'should pass a11y checks',
    checkAccessibility([
      {
        // AnnotationEditor is primarily a container and state-managing component;
        // a11y should be more deeply checked on the leaf components
        content: () => createComponent(),
      },
    ])
  );
});
