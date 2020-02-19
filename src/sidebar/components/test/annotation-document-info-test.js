import { mount } from 'enzyme';
import { createElement } from 'preact';

import * as fixtures from '../../test/annotation-fixtures';
import AnnotationDocumentInfo from '../annotation-document-info';
import { $imports } from '../annotation-document-info';

import { checkAccessibility } from '../../../test-util/accessibility';
import mockImportedComponents from '../../../test-util/mock-imported-components';

describe('AnnotationDocumentInfo', () => {
  let fakeDomainAndTitle;
  let fakeMetadata;

  const createAnnotationDocumentInfo = props => {
    return mount(
      <AnnotationDocumentInfo
        annotation={fixtures.defaultAnnotation()}
        {...props}
      />
    );
  };

  beforeEach(() => {
    fakeDomainAndTitle = sinon.stub();
    fakeMetadata = { domainAndTitle: fakeDomainAndTitle };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../util/annotation-metadata': fakeMetadata,
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('should not render if there is no document title', () => {
    fakeDomainAndTitle.returns({});

    const wrapper = createAnnotationDocumentInfo();
    const info = wrapper.find('.annotation-document-info');

    assert.notOk(info.exists());
  });

  it('should render the document title', () => {
    fakeDomainAndTitle.returns({ titleText: 'I have a title' });

    const wrapper = createAnnotationDocumentInfo();
    const info = wrapper.find('.annotation-document-info');

    assert.isOk(info.exists());
  });

  it('should render a link if available', () => {
    fakeDomainAndTitle.returns({
      titleText: 'I have a title',
      titleLink: 'https://www.example.com',
    });

    const wrapper = createAnnotationDocumentInfo();
    const link = wrapper.find('.annotation-document-info__title a');

    assert.equal(link.prop('href'), 'https://www.example.com');
  });

  it('should render domain if available', () => {
    fakeDomainAndTitle.returns({
      titleText: 'I have a title',
      domain: 'www.example.com',
    });

    const wrapper = createAnnotationDocumentInfo();
    const domain = wrapper.find('.annotation-document-info__domain');

    assert.equal(domain.text(), '(www.example.com)');
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => {
        fakeDomainAndTitle.returns({
          titleText: 'I have a title',
          domain: 'www.example.com',
        });
        return createAnnotationDocumentInfo();
      },
    })
  );
});
