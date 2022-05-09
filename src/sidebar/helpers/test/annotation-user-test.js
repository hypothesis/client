import {
  annotationDisplayName,
  annotationAuthorLink,
  annotationAuthorInfo,
  $imports,
} from '../annotation-user';

describe('sidebar/helpers/annotation-user', () => {
  let fakeAccountId;
  let fakeSettings;
  let fakeStore;

  beforeEach(() => {
    fakeSettings = { usernameUrl: 'http://foo.bar/' };

    fakeStore = {
      defaultAuthority: sinon.stub().returns('foo.com'),
      isFeatureEnabled: sinon.stub().returns(false),
      getLink: sinon
        .stub()
        .withArgs('user')
        .returns('http://www.example.com/user/'),
    };

    fakeAccountId = {
      isThirdPartyUser: sinon.stub().returns(false),
      username: sinon.stub().returns('albert'),
    };

    $imports.$mock({
      './account-id': fakeAccountId,
    });
  });

  const fakeAnnotations = {
    withDisplayName: {
      user: 'acct:albert@victoriana.com',
      user_info: { display_name: 'Albert, Prince Consort' },
    },
    noDisplayName: {
      user: 'acct:albert@victoriana.com',
      user_info: {},
    },
    noUserInfo: {
      user: 'acct:albert@victoriana.com',
    },
  };

  describe('annotationDisplayName', () => {
    context('annotation with first-party author', () => {
      [
        {
          annotation: fakeAnnotations.withDisplayName,
          expected: 'albert',
        },
        {
          annotation: fakeAnnotations.noDisplayName,
          expected: 'albert',
        },
        {
          annotation: fakeAnnotations.noUserInfo,
          expected: 'albert',
        },
      ].forEach(testcase => {
        it('should return author username if display-names feature flag is not enabled', () => {
          fakeStore.isFeatureEnabled
            .withArgs('client_display_names')
            .returns(false);
          assert.equal(
            annotationDisplayName(testcase.annotation, fakeStore),
            testcase.expected
          );
        });
      });

      [
        {
          annotation: fakeAnnotations.withDisplayName,
          expected: 'Albert, Prince Consort',
        },
        {
          annotation: fakeAnnotations.noDisplayName,
          expected: 'albert',
        },
        {
          annotation: fakeAnnotations.noUserInfo,
          expected: 'albert',
        },
      ].forEach(testcase => {
        it('should return author display name when available if display-names feature flag is enabled', () => {
          fakeStore.isFeatureEnabled
            .withArgs('client_display_names')
            .returns(true);
          assert.equal(
            annotationDisplayName(testcase.annotation, fakeStore),
            testcase.expected
          );
        });
      });
    });

    context('annotation with third-party author', () => {
      [
        {
          annotation: fakeAnnotations.withDisplayName,
          expected: 'Albert, Prince Consort',
        },
        {
          annotation: fakeAnnotations.noDisplayName,
          expected: 'albert',
        },
        {
          annotation: fakeAnnotations.noUserInfo,
          expected: 'albert',
        },
      ].forEach(testcase => {
        it('should return author display name if available', () => {
          fakeAccountId.isThirdPartyUser.returns(true);
          assert.equal(
            annotationDisplayName(testcase.annotation, fakeStore),
            testcase.expected
          );
        });
      });
    });
  });

  describe('annotationAuthorLink', () => {
    it('should return a URL for first-party users', () => {
      fakeAccountId.isThirdPartyUser.returns(false);
      assert.equal(
        annotationAuthorLink(
          fakeAnnotations.withDisplayName,
          fakeStore,
          fakeSettings
        ),
        'http://www.example.com/user/'
      );
    });

    it('should return a URL for third-party users when configured with `usernameUrl`', () => {
      fakeAccountId.isThirdPartyUser.returns(true);
      assert.equal(
        annotationAuthorLink(
          fakeAnnotations.withDisplayName,
          fakeStore,
          fakeSettings
        ),
        'http://foo.bar/albert'
      );
    });

    it('should not return a URL for third-party users if not configured with `usernameUrl`', () => {
      fakeAccountId.isThirdPartyUser.returns(true);
      assert.isUndefined(
        annotationAuthorLink(fakeAnnotations.withDisplayName, fakeStore, {})
      );
    });
  });

  describe('annotationAuthorInfo', () => {
    it('should return both a display name and a link for annotation author', () => {
      assert.deepEqual(
        annotationAuthorInfo(
          fakeAnnotations.withDisplayName,
          fakeStore,
          fakeSettings
        ),
        {
          authorDisplayName: 'albert',
          authorLink: 'http://www.example.com/user/',
        }
      );
    });
  });
});
