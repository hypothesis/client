const { createElement } = require('preact');
const { mount } = require('enzyme');

const AnnotationQuote = require('../annotation-quote');
const { $imports } = require('../annotation-quote');
const mockImportedComponents = require('./mock-imported-components');

describe('AnnotationQuote', () => {
  let fakeAnnotation;
  let fakeIsOrphan;
  let fakeQuote;

  function createQuote(props) {
    return mount(
      <AnnotationQuote annotation={fakeAnnotation} settings={{}} {...props} />
    );
  }

  beforeEach(() => {
    fakeAnnotation = {
      target: [],
    };

    fakeQuote = sinon.stub().returns('test quote');
    fakeIsOrphan = sinon.stub();

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../util/annotation-metadata': {
        quote: fakeQuote,
        isOrphan: fakeIsOrphan,
      },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('renders the quote', () => {
    const wrapper = createQuote();
    const quote = wrapper.find('blockquote');
    assert.equal(quote.text(), 'test quote');
  });
});
