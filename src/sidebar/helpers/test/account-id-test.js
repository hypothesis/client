import {
  parseAccountID,
  username,
  isThirdPartyUser,
  buildAccountID,
} from '../account-id';

describe('sidebar/helpers/account-id', () => {
  const term = 'acct:hacker@example.com';

  describe('parseAccountID', () => {
    it('should extract the username and provider', () => {
      assert.deepEqual(parseAccountID(term), {
        username: 'hacker',
        provider: 'example.com',
      });
    });

    it('should return null if the ID is invalid', () => {
      assert.equal(parseAccountID('bogus'), null);
    });
  });

  describe('buildAccountID', () => {
    [
      {
        username: 'john',
        provider: 'hypothes.is',
        expectedAccountID: 'acct:john@hypothes.is',
      },
      {
        username: 'jane',
        provider: 'example.com',
        expectedAccountID: 'acct:jane@example.com',
      },
    ].forEach(({ username, provider, expectedAccountID }) => {
      it('builds userid for username and provider', () => {
        assert.equal(buildAccountID(username, provider), expectedAccountID);
      });
    });
  });

  describe('username', () => {
    it('should return the username from the account ID', () => {
      assert.equal(username(term), 'hacker');
    });

    it('should return an empty string if the ID is invalid', () => {
      assert.equal(username('bogus'), '');
    });
  });

  describe('isThirdPartyUser', () => {
    it('should return true if user is a third party user', () => {
      assert.isTrue(isThirdPartyUser('acct:someone@example.com', 'ex.com'));
    });

    it('should return false if user is not a third party user', () => {
      assert.isFalse(
        isThirdPartyUser('acct:someone@example.com', 'example.com'),
      );
    });

    it('should return false if the user is invalid', () => {
      assert.isFalse(isThirdPartyUser('bogus', 'example.com'));
    });
  });
});
