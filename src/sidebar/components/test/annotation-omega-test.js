import { mount } from 'enzyme';
import { createElement } from 'preact';

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
      getDraft: sinon.stub(),
      getDefault: sinon.stub(),
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
