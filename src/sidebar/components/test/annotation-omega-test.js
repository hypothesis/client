import { mount } from 'enzyme';
import { createElement } from 'preact';
import { act } from 'preact/test-utils';

import * as fixtures from '../../test/annotation-fixtures';

import mockImportedComponents from './mock-imported-components';

// @TODO Note this import as `Annotation` for easier updating later

import Annotation from '../annotation-omega';
import { $imports } from '../annotation-omega';

describe('AnnotationOmega', () => {
  let fakeOnReplyCountClick;

  // Dependency Mocks
  let fakeMetadata;
  let fakePermissions;
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
        onReplyCountClick={fakeOnReplyCountClick}
        replyCount={0}
        showDocumentInfo={false}
        {...props}
      />
    );
  };

  beforeEach(() => {
    fakeOnReplyCountClick = sinon.stub();

    fakeMetadata = {
      isNew: sinon.stub(),
      isReply: sinon.stub().returns(false),
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
      setDefault: sinon.stub(),
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

    it('should set `isShared` to `false` if annotation is private', () => {
      const draft = fixtures.defaultDraft();
      draft.isPrivate = true;

      fakeStore.getDraft.returns(draft);

      const wrapper = createComponent();

      assert.isFalse(wrapper.find('AnnotationPublishControl').props().isShared);
    });

    it('should set `isShared` to `true` if annotation is shared', () => {
      const draft = fixtures.defaultDraft();
      draft.isPrivate = false;
      fakeStore.getDraft.returns(draft);

      const wrapper = createComponent();

      assert.isTrue(wrapper.find('AnnotationPublishControl').props().isShared);
    });

    it('should update annotation privacy when changed by publish control', () => {
      setEditingMode(true);

      const wrapper = createComponent();

      act(() => {
        wrapper
          .find('AnnotationPublishControl')
          .props()
          .onSetPrivacy({ level: 'private' });
      });

      const call = fakeStore.createDraft.getCall(0);

      assert.calledOnce(fakeStore.createDraft);
      assert.isTrue(call.args[1].isPrivate);
    });

    it('should update annotation privacy default on change', () => {
      setEditingMode(true);

      const wrapper = createComponent();

      act(() => {
        wrapper
          .find('AnnotationPublishControl')
          .props()
          .onSetPrivacy({ level: 'private' });
      });

      assert.calledOnce(fakeStore.setDefault);
      assert.calledWith(fakeStore.setDefault, 'annotationPrivacy', 'private');
    });

    it('should not update annotation privacy default on change if annotation is reply', () => {
      fakeMetadata.isReply.returns(true);

      setEditingMode(true);

      const wrapper = createComponent();

      act(() => {
        wrapper
          .find('AnnotationPublishControl')
          .props()
          .onSetPrivacy({ level: 'private' });
      });

      assert.equal(fakeStore.setDefault.callCount, 0);
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

  describe('annotation actions', () => {
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
  });
});
