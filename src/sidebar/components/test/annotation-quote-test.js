const { createElement } = require('preact');
const { mount } = require('enzyme');

const AnnotationQuote = require('../annotation-quote');
const { $imports } = require('../annotation-quote');
const mockImportedComponents = require('./mock-imported-components');

describe('AnnotationQuote', () => {
  function createQuote(props) {
    return mount(
      <AnnotationQuote quote="test quote" settings={{}} {...props} />
    );
  }

  beforeEach(() => {
    $imports.$mock(mockImportedComponents());
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
