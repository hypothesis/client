'use strict';

const { createElement } = require('preact');
const { mount } = require('enzyme');

const mockImportedComponents = require('./mock-imported-components');
const TagList = require('../tag-list');

describe('TagList', function() {
  let fakeServiceUrl;
  let fakeIsThirdPartyUser;

  function createComponent(props) {
    return mount(
      <TagList
        // props
        annotation={{}}
        tags={['tag1', 'tag2']}
        // service props
        serviceUrl={fakeServiceUrl}
        settings={{}}
        {...props}
      />
    );
  }

  beforeEach(function() {
    fakeServiceUrl = sinon.stub().returns('http://serviceurl.com');
    fakeIsThirdPartyUser = sinon.stub();
    fakeIsThirdPartyUser.returns(false);

    TagList.$imports.$mock(mockImportedComponents());
    TagList.$imports.$mock({
      '../util/account-id': {
        isThirdPartyUser: fakeIsThirdPartyUser,
      },
    });
  });

  afterEach(() => {
    TagList.$imports.$restore();
  });

  it('adds appropriate class names and tag values to the elements', () => {
    const wrapper = createComponent();
    assert.equal(
      wrapper
        .find('a.tag-list__link')
        .at(0)
        .text(),
      'tag1'
    );
    assert.equal(
      wrapper
        .find('a.tag-list__link')
        .at(1)
        .text(),
      'tag2'
    );
  });

  it('adds appropriate aria values to the elements', () => {
    const wrapper = createComponent();
    assert.equal(
      wrapper
        .find('.tag-list__item a')
        .at(0)
        .prop('aria-label'),
      'Tag: tag1'
    );
    assert.equal(
      wrapper
        .find('.tag-list__item a')
        .at(1)
        .prop('aria-label'),
      'Tag: tag2'
    );
  });

  it('does not render any tags if tags prop is empty', () => {
    const wrapper = createComponent({ tags: [] });
    assert.isFalse(wrapper.find('.tag-list__item a').exists());
  });

  it('renders the href when isThirdPartyUser is false', () => {
    const wrapper = createComponent();
    assert.equal(
      wrapper
        .find('a.tag-list__link')
        .at(0)
        .prop('href'),
      'http://serviceurl.com'
    );
    assert.equal(
      wrapper
        .find('a.tag-list__link')
        .at(1)
        .prop('href'),
      'http://serviceurl.com'
    );

    assert.calledWith(fakeServiceUrl, 'search.tag', { tag: 'tag1' });
    assert.calledWith(fakeServiceUrl, 'search.tag', { tag: 'tag2' });
  });

  it('does not render the href when isThirdPartyUser is true', () => {
    fakeIsThirdPartyUser.returns(true);
    const wrapper = createComponent();
    assert.equal(
      wrapper
        .find('a.tag-list__link')
        .at(0)
        .prop('href'),
      undefined
    );

    assert.equal(
      wrapper
        .find('a.tag-list__link')
        .at(1)
        .prop('href'),
      undefined
    );

    assert.notCalled(fakeServiceUrl);
  });
});
