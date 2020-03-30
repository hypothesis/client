import { mount } from 'enzyme';
import { createElement } from 'preact';

import TagList from '../tag-list';
import { $imports } from '../tag-list';

import { checkAccessibility } from '../../../test-util/accessibility';
import mockImportedComponents from '../../../test-util/mock-imported-components';

describe('TagList', function () {
  let fakeServiceUrl;
  let fakeIsThirdPartyUser;
  const fakeTags = ['tag1', 'tag2'];

  function createComponent(props) {
    return mount(
      <TagList
        // props
        annotation={{}}
        tags={fakeTags}
        // service props
        serviceUrl={fakeServiceUrl}
        settings={{}}
        {...props}
      />
    );
  }

  beforeEach(function () {
    fakeServiceUrl = sinon.stub().returns('http://serviceurl.com');
    fakeIsThirdPartyUser = sinon.stub().returns(false);

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../util/account-id': {
        isThirdPartyUser: fakeIsThirdPartyUser,
      },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('does not render any tags if `tags` prop is empty', () => {
    const wrapper = createComponent({ tags: [] });
    assert.isFalse(wrapper.find('.tag-list__item a').exists());
  });

  context('when `isThirdPartyUser` returns false', () => {
    it('adds appropriate classes, props and values', () => {
      const wrapper = createComponent();
      wrapper.find('a').forEach((link, i) => {
        assert.isTrue(link.hasClass('tag-list__link'));
        assert.equal(link.prop('aria-label'), `Tag: ${fakeTags[i]}`);
        assert.equal(link.prop('href'), 'http://serviceurl.com');
        assert.equal(
          link.prop('title'),
          `View annotations with tag: ${fakeTags[i]}`
        );
        assert.equal(link.text(), fakeTags[i]);
      });
    });

    it('calls fakeServiceUrl()', () => {
      createComponent();
      assert.calledWith(fakeServiceUrl, 'search.tag', { tag: 'tag1' });
      assert.calledWith(fakeServiceUrl, 'search.tag', { tag: 'tag2' });
    });
  });

  context('when `isThirdPartyUser` returns true', () => {
    beforeEach(function () {
      fakeIsThirdPartyUser.returns(true);
    });

    it('adds appropriate classes, props and values', () => {
      const wrapper = createComponent();
      wrapper.find('span').forEach((link, i) => {
        assert.isTrue(link.hasClass('tag-list__text'));
        assert.equal(link.prop('aria-label'), `Tag: ${fakeTags[i]}`);
        assert.equal(link.text(), fakeTags[i]);
      });
    });

    it('does not call fakeServiceUrl()', () => {
      createComponent();
      assert.notCalled(fakeServiceUrl);
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility([
      {
        name: 'first-party user',
        content: () => createComponent({ tags: ['tag1', 'tag2'] }),
      },
      {
        name: 'third-party user',
        content: () => {
          fakeIsThirdPartyUser.returns(true);
          return createComponent({ tags: ['tag1', 'tag2'] });
        },
      },
    ])
  );
});
