'use strict';

const { createElement } = require('preact');
const { shallow } = require('enzyme');

const fixtures = require('../../test/annotation-fixtures');

const AnnotationDocumentInfo = require('../annotation-document-info');

describe('AnnotationDocumentInfo', () => {
  let fakeDomainAndTitle;
  let fakeMetadata;

  const createAnnotationDocumentInfo = props => {
    return shallow(
      <AnnotationDocumentInfo
        annotation={fixtures.defaultAnnotation()}
        {...props}
      />
    );
  };

  beforeEach(() => {
    fakeDomainAndTitle = sinon.stub();
    fakeMetadata = { domainAndTitle: fakeDomainAndTitle };
    AnnotationDocumentInfo.$imports.$mock({
      '../util/annotation-metadata': fakeMetadata,
    });
  });

  afterEach(() => {
    AnnotationDocumentInfo.$imports.$restore();
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
});
