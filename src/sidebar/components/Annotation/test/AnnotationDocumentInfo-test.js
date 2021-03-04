import { mount } from 'enzyme';

import { checkAccessibility } from '../../../../test-util/accessibility';

import AnnotationDocumentInfo from '../AnnotationDocumentInfo';

describe('AnnotationDocumentInfo', () => {
  const createAnnotationDocumentInfo = props => {
    return mount(
      <AnnotationDocumentInfo
        domain="www.foo.bar"
        link="http://www.baz"
        title="Turtles"
        {...props}
      />
    );
  };

  it('should render the document title', () => {
    const wrapper = createAnnotationDocumentInfo();

    assert.include(wrapper.text(), '"Turtles"');
  });

  it('should render a link if available', () => {
    const wrapper = createAnnotationDocumentInfo();
    const link = wrapper.find('a');

    assert.equal(link.prop('href'), 'http://www.baz');
  });

  it('should render domain if available', () => {
    const wrapper = createAnnotationDocumentInfo();

    assert.include(wrapper.text(), '(www.foo.bar)');
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => {
        return createAnnotationDocumentInfo();
      },
    })
  );
});
