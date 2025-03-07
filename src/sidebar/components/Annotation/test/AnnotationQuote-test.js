import {
  checkAccessibility,
  mockImportedComponents,
} from '@hypothesis/frontend-testing';
import { mount } from '@hypothesis/frontend-testing';

import AnnotationQuote, { $imports } from '../AnnotationQuote';

describe('AnnotationQuote', () => {
  let fakeApplyTheme;

  function createQuote(props) {
    return mount(
      <AnnotationQuote
        quote={'test quote'}
        isHovered={false}
        isOrphan={false}
        settings={{}}
        {...props}
      />,
    );
  }

  beforeEach(() => {
    fakeApplyTheme = sinon.stub().returns({});

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../../helpers/theme': {
        applyTheme: fakeApplyTheme,
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

  it('applies selectionFontFamily styling from settings', () => {
    fakeApplyTheme
      .withArgs(sinon.match.array.deepEquals(['selectionFontFamily']))
      .returns({ fontFamily: 'monospace' });

    const wrapper = createQuote();

    const quote = wrapper.find('blockquote');

    assert.equal(quote.getDOMNode().style.fontFamily, 'monospace');
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => createQuote(),
    }),
  );
});
