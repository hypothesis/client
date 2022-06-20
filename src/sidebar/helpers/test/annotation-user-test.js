import {
  annotationDisplayName,
  annotationAuthorLink,
  $imports,
} from '../annotation-user';

describe('sidebar/helpers/annotation-user', () => {
  let fakeAccountId;
  let fakeSettings;

  beforeEach(() => {
    fakeSettings = { usernameUrl: 'http://foo.bar/' };

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
          assert.equal(
            annotationDisplayName(testcase.annotation, 'firstparty.com', false),
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
          assert.equal(
            annotationDisplayName(testcase.annotation, 'firstparty.com', true),
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
          // Third-party annotations always display display name (if available)
          // even if feature-flag is not enabled
          assert.equal(
            annotationDisplayName(testcase.annotation, 'thirdparty.com', false),
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
          fakeSettings,
          'firstparty.com',
          'http://www.example.com/user/'
        ),
        'http://www.example.com/user/'
      );
    });

    it('should return a URL for third-party users when configured with `usernameUrl`', () => {
      fakeAccountId.isThirdPartyUser.returns(true);
      assert.equal(
        annotationAuthorLink(
          fakeAnnotations.withDisplayName,
          fakeSettings,
          'thirdparty.com',
          'http://www.example.com/user/'
        ),
        'http://foo.bar/albert'
      );
    });

    it('should not return a URL for third-party users if not configured with `usernameUrl`', () => {
      fakeAccountId.isThirdPartyUser.returns(true);
      assert.isUndefined(
        annotationAuthorLink(
          fakeAnnotations.withDisplayName,
          {},
          'thirdparty.com',
          'http://www.example.com/user/'
        )
      );
    });
  });
});
