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
  let fakeQuote;
  let fakeStore;

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

    fakeQuote = sinon.stub();
    fakeStore = {
      createDraft: sinon.stub(),
      getDraft: sinon.stub().returns(null),
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../util/annotation-metadata': {
        quote: fakeQuote,
      },
      '../store/use-store': callback => callback(fakeStore),
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  describe('annotation quote', () => {
    it('renders quote if annotation has a quote', () => {
      fakeQuote.returns('quote');
      const wrapper = createComponent();

      const quote = wrapper.find('AnnotationQuote');
      assert.isTrue(quote.exists());
    });

    it('does not render quote if annotation does not have a quote', () => {
      fakeQuote.returns(null);

      const wrapper = createComponent();

      const quote = wrapper.find('AnnotationQuote');
      assert.isFalse(quote.exists());
    });
  });

  describe('annotation body and excerpt', () => {
    it('updates annotation state when text edited', () => {
      const wrapper = createComponent();
      const body = wrapper.find('AnnotationBody');

      act(() => {
        body.props().onEditText({ text: 'updated text' });
      });

      assert.calledOnce(fakeStore.createDraft);
    });
  });

  describe('tags', () => {
    it('renders tag editor if `isEditing', () => {
      // The presence of a draft will make `isEditing` `true`
      fakeStore.getDraft.returns(fixtures.defaultDraft());

      const wrapper = createComponent();

      assert.isOk(wrapper.find('TagEditor').exists());
      assert.notOk(wrapper.find('TagList').exists());
    });

    it('updates annotation state if tags changed', () => {
      fakeStore.getDraft.returns(fixtures.defaultDraft());
      const wrapper = createComponent();

      wrapper
        .find('TagEditor')
        .props()
        .onEditTags({ tags: ['uno', 'dos'] });

      assert.calledOnce(fakeStore.createDraft);
    });

    it('renders tag list if not `isEditing', () => {
      const wrapper = createComponent();

      assert.isOk(wrapper.find('TagList').exists());
      assert.notOk(wrapper.find('TagEditor').exists());
    });
  });
});
