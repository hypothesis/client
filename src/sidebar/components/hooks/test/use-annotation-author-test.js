import { mount } from 'enzyme';

import {
  useAnnotationAuthorName,
  useAnnotationAuthorLink,
  $imports,
} from '../use-annotation-author';

describe('sidebar/components/hooks/use-annotation-author', () => {
  let fakeAccountId;
  let fakeStore;
  let lastAuthorName;
  let lastAuthorLink;
  let fakeAnnotation;
  let fakeSettings;

  // Mount a dummy component to be able to use the hook
  function DummyComponent({
    annotation = fakeAnnotation,
    settings = fakeSettings,
  }) {
    lastAuthorName = useAnnotationAuthorName(annotation);
    lastAuthorLink = useAnnotationAuthorLink(annotation, settings);
  }

  beforeEach(() => {
    fakeAnnotation = {
      user: 'dingbat',
      user_info: { display_name: 'Ding Bat' },
    };
    fakeAccountId = {
      isThirdPartyUser: sinon.stub(),
      username: sinon.stub().returnsArg(0),
    };

    fakeSettings = {
      usernameUrl: 'http://www.example.com/user/',
    };

    fakeStore = {
      defaultAuthority: sinon.stub().returns('foo.com'),
      getLink: sinon.stub().returns('http://www.example.com/link'),
      isFeatureEnabled: sinon.stub(),
    };

    $imports.$mock({
      '../../helpers/account-id': fakeAccountId,
      '../../store': { useSidebarStore: () => fakeStore },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  describe('useAnnotationAuthorName', () => {
    context('first-party user', () => {
      beforeEach(() => {
        fakeAccountId.isThirdPartyUser.returns(false);
      });

      it('should use display name if feature flag enabled and display name available', () => {
        fakeStore.isFeatureEnabled
          .withArgs('client_display_names')
          .returns(true);
        mount(<DummyComponent />);

        assert.equal(lastAuthorName, 'Ding Bat');
      });
      it('should use username if feature flag enabled but display name unavailable', () => {
        fakeStore.isFeatureEnabled
          .withArgs('client_display_names')
          .returns(true);

        mount(<DummyComponent annotation={{ user: 'dingbat' }} />);

        assert.equal(lastAuthorName, 'dingbat');
      });

      it('should use username if feature flag disabled', () => {
        fakeStore.isFeatureEnabled
          .withArgs('client_display_names')
          .returns(false);

        mount(<DummyComponent />);

        assert.equal(lastAuthorName, 'dingbat');
      });
    });

    context('third-party user', () => {
      beforeEach(() => {
        fakeAccountId.isThirdPartyUser.returns(true);
      });

      it('should use display name if available', () => {
        // The value of this feature flag should be irrelevant
        fakeStore.isFeatureEnabled
          .withArgs('client_display_names')
          .returns(false);

        mount(<DummyComponent />);

        assert.equal(lastAuthorName, 'Ding Bat');
      });

      it('should use username if no display name is available', () => {
        mount(<DummyComponent annotation={{ user: 'dingbat' }} />);

        assert.equal(lastAuthorName, 'dingbat');
      });
    });
  });

  describe('useAnnotationAuthorLink', () => {
    context('first-party user', () => {
      beforeEach(() => {
        fakeAccountId.isThirdPartyUser.returns(false);
      });

      it('should return user link from store', () => {
        fakeStore.getLink
          .withArgs('user')
          .returns('http://www.example.com/user-link');

        mount(<DummyComponent />);

        assert.equal(lastAuthorLink, 'http://www.example.com/user-link');
        assert.calledWith(
          fakeStore.getLink,
          'user',
          sinon.match({ user: 'dingbat' })
        );
      });
    });

    context('third-party user', () => {
      beforeEach(() => {
        fakeAccountId.isThirdPartyUser.returns(true);
      });

      it('should return URL formatted from `usernameUrl` in `settings`', () => {
        fakeSettings = {
          usernameUrl: 'http://www.example.com/user/',
        };

        mount(<DummyComponent />);

        assert.equal(lastAuthorLink, 'http://www.example.com/user/dingbat');
      });

      it('should not return a URL if no `usernameUrl` in `settings`', () => {
        fakeSettings = {};

        mount(<DummyComponent />);

        assert.isUndefined(lastAuthorLink);
      });
    });
  });
});
