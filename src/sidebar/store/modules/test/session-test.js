import createStore from '../../create-store';
import session from '../session';

describe('sidebar/store/modules/session', function () {
  let store;

  beforeEach(() => {
    store = createStore([session]);
  });

  describe('#updateProfile', function () {
    it('updates the profile data', function () {
      const newProfile = Object.assign({ userid: 'john' });
      store.updateProfile({ userid: 'john' });
      assert.deepEqual(store.profile(), newProfile);
    });
  });

  describe('#isLoggedIn', () => {
    [
      { userid: 'john', expectedIsLoggedIn: true },
      { userid: null, expectedIsLoggedIn: false },
    ].forEach(({ userid, expectedIsLoggedIn }) => {
      it('returns whether the user is logged in', () => {
        store.updateProfile({ userid: userid });
        assert.equal(store.isLoggedIn(), expectedIsLoggedIn);
      });
    });
  });

  describe('#profile', () => {
    it("returns the user's profile", () => {
      store.updateProfile({ userid: 'john' });
      assert.deepEqual(store.profile(), {
        userid: 'john',
      });
    });
  });
});
