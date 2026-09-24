import { createStore } from '../../create-store';
import { sessionModule } from '../session';

describe('sidebar/store/modules/session', () => {
  let fakeSettings;
  let store;

  beforeEach(() => {
    fakeSettings = {};
    store = createStore([sessionModule], [fakeSettings]);
  });

  describe('#updateProfile', () => {
    it('updates the profile data', () => {
      const newProfile = Object.assign({ userid: 'john' });
      store.updateProfile({ userid: 'john' });
      assert.deepEqual(store.profile(), newProfile);
    });
  });

  describe('#defaultAuthority', () => {
    it('returns the default authority from the settings', () => {
      fakeSettings.authDomain = 'foo.com';
      store = createStore([sessionModule], [fakeSettings]);

      assert.equal(store.defaultAuthority(), 'foo.com');
    });
  });

  describe('#isLoggedIn', () => {
    [
      { userid: 'john', expectedIsLoggedIn: true },
      { userid: null, expectedIsLoggedIn: false },
    ].forEach(({ userid, expectedIsLoggedIn }) => {
      it('returns whether the user is logged in', () => {
        store.updateProfile({ userid });
        assert.equal(store.isLoggedIn(), expectedIsLoggedIn);
      });
    });
  });

  describe('#isFeatureEnabled', () => {
    it('returns false before features have been fetched', () => {
      assert.isFalse(store.isFeatureEnabled('some_feature'));
    });

    it('returns false if feature is unknown', () => {
      store.updateProfile({ userid: null, features: {} });
      assert.isFalse(store.isFeatureEnabled('some_feature'));
    });

    [true, false].forEach(enabled => {
      it('returns feature flag state if profile is fetched and feature exists', () => {
        store.updateProfile({
          userid: null,
          features: { some_feature: enabled },
        });
        assert.equal(store.isFeatureEnabled('some_feature'), enabled);
      });
    });

    it('returns true if feature is enabled in global `features` setting', () => {
      const settings = {
        ...fakeSettings,
        features: ['some_feature'],
      };
      store = createStore([sessionModule], [settings]);
      assert.isTrue(store.isFeatureEnabled('some_feature'));
    });
  });

  describe('#features', () => {
    beforeEach(() => {
      const settings = {
        ...fakeSettings,
        features: ['global_feature'],
      };
      store = createStore([sessionModule], [settings]);
    });

    it('returns only global features before profile is loaded', () => {
      assert.deepEqual(store.features(), {
        global_feature: true,
      });
    });

    it('returns combined features after profile is loaded', () => {
      store.updateProfile({
        userid: null,
        features: { user_feature: true, other_feature: false },
      });
      assert.deepEqual(store.features(), {
        global_feature: true,
        user_feature: true,
        other_feature: false,
      });
    });
  });

  describe('#hasFetchedProfile', () => {
    it('returns false before profile is updated', () => {
      assert.isFalse(store.hasFetchedProfile());
    });

    it('returns true after profile is updated', () => {
      store.updateProfile({ userid: 'john' });
      assert.isTrue(store.hasFetchedProfile());
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

  describe('#isInstructorSurveyPending', () => {
    it('returns true when the flag is on and H is asking this user', () => {
      store.updateProfile({
        userid: 'john',
        features: { instructor_survey: true },
        preferences: { show_instructor_survey: true },
      });
      assert.isTrue(store.isInstructorSurveyPending());
    });

    it('returns false when the flag is off', () => {
      store.updateProfile({
        userid: 'john',
        features: {},
        preferences: { show_instructor_survey: true },
      });
      assert.isFalse(store.isInstructorSurveyPending());
    });

    it('returns false when H is not asking this user', () => {
      store.updateProfile({
        userid: 'john',
        features: { instructor_survey: true },
        preferences: {},
      });
      assert.isFalse(store.isInstructorSurveyPending());
    });

    it('returns false before a profile has been fetched', () => {
      assert.isFalse(store.isInstructorSurveyPending());
    });
  });

  describe('#nudgeInstructorSurvey', () => {
    it('counts each attempt to get past the survey', () => {
      assert.equal(store.instructorSurveyNudges(), 0);

      store.nudgeInstructorSurvey();
      store.nudgeInstructorSurvey();

      assert.equal(store.instructorSurveyNudges(), 2);
    });

    it('leaves the profile alone', () => {
      store.updateProfile({ userid: 'john', features: {}, preferences: {} });

      store.nudgeInstructorSurvey();

      assert.equal(store.profile().userid, 'john');
    });
  });
});
