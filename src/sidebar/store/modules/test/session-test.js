import createStore from '../../create-store';
import session from '../session';

const { init } = session;

describe('sidebar/store/modules/session', function () {
  let store;

  beforeEach(() => {
    store = createStore([session]);
  });

  describe('#updateSession', function () {
    it('updates the session state', function () {
      const newSession = Object.assign(init(), { userid: 'john' });
      store.updateSession({ userid: 'john' });
      assert.deepEqual(store.getState().session, newSession);
    });
  });

  describe('#isLoggedIn', () => {
    [
      { userid: 'john', expectedIsLoggedIn: true },
      { userid: null, expectedIsLoggedIn: false },
    ].forEach(({ userid, expectedIsLoggedIn }) => {
      it('returns whether the user is logged in', () => {
        store.updateSession({ userid: userid });
        assert.equal(store.isLoggedIn(), expectedIsLoggedIn);
      });
    });
  });

  describe('#profile', () => {
    it("returns the user's profile", () => {
      store.updateSession({ userid: 'john' });
      assert.deepEqual(store.profile(), {
        userid: 'john',
        features: {},
        preferences: {},
      });
    });
  });
});
