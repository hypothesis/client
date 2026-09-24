import * as sessionUtil from '../session';

describe('sidebar/helpers/session', () => {
  describe('shouldAutoDisplayTutorial', () => {
    [
      {
        // The only "true" state
        description: 'in sidebar with loaded user preference to show tutorial',
        isSidebar: true,
        sessionState: { preferences: { show_sidebar_tutorial: true } },
        settings: {},
        expected: true,
      },
      {
        description: 'in sidebar with no loaded user profile',
        isSidebar: true,
        sessionState: {},
        settings: {},
        expected: false,
      },
      {
        description: 'not in sidebar with no loaded user profile',
        isSidebar: false,
        sessionState: {},
        settings: {},
        expected: false,
      },
      {
        description:
          'in sidebar with loaded user preference not to show tutorial',
        isSidebar: true,
        sessionState: { preferences: { show_sidebar_tutorial: false } },
        settings: {},
        expected: false,
      },
      {
        description:
          'in sidebar with loaded user preference to show tutorial and configured help service',
        isSidebar: true,
        sessionState: { preferences: { show_sidebar_tutorial: true } },
        settings: { services: [{ onHelpRequestProvided: true }] },
        expected: false,
      },
      {
        description:
          'not in sidebar with loaded user preference to show tutorial and configured help service',
        isSidebar: false,
        sessionState: { preferences: { show_sidebar_tutorial: true } },
        settings: { services: [{ onHelpRequestProvided: true }] },
        expected: false,
      },
      {
        description:
          'not in sidebar with no loaded user profile and configured help service',
        isSidebar: false,
        sessionState: {},
        settings: { services: [{ onHelpRequestProvided: true }] },
        expected: false,
      },
      {
        description: 'help panel is disabled',
        isSidebar: true,
        sessionState: {},
        settings: {
          services: [
            {
              enableHelpPanel: false,
            },
          ],
        },
        expected: false,
      },
    ].forEach(fixture => {
      it(`should calculate auto-display to be ${fixture.expected} when ${fixture.description}`, () => {
        const shouldDisplay = sessionUtil.shouldAutoDisplayTutorial(
          fixture.isSidebar,
          fixture.sessionState,
          fixture.settings,
        );
        assert.equal(shouldDisplay, fixture.expected);
      });
    });
  });

  describe('shouldShowYoutubeDisclaimer', () => {
    [
      {
        description:
          'youtubeAssignment is true and H sends show_youtube_gdpr_banner true',
        settings: { youtubeAssignment: true },
        profile: { preferences: { show_youtube_gdpr_banner: true } },
        expected: true,
      },
      {
        description:
          'youtubeAssignment is true and preference is undefined (no banner)',
        settings: { youtubeAssignment: true },
        profile: {},
        expected: false,
      },
      {
        description:
          'youtubeAssignment is true but user has dismissed (H omits key)',
        settings: { youtubeAssignment: true },
        profile: { preferences: {} },
        expected: false,
      },
      {
        description: 'youtubeAssignment is false',
        settings: { youtubeAssignment: false },
        profile: { preferences: { show_youtube_gdpr_banner: true } },
        expected: false,
      },
      {
        description: 'youtubeAssignment is undefined',
        settings: {},
        profile: { preferences: { show_youtube_gdpr_banner: true } },
        expected: false,
      },
    ].forEach(fixture => {
      it(`returns ${fixture.expected} when ${fixture.description}`, () => {
        const result = sessionUtil.shouldShowYoutubeDisclaimer(
          fixture.settings,
          fixture.profile,
        );
        assert.equal(result, fixture.expected);
      });
    });
  });

  describe('shouldShowInstructorSurvey', () => {
    [
      {
        description: 'the flag is on and H says the survey is pending',
        features: { instructor_survey: true },
        profile: { preferences: { show_instructor_survey: true } },
        expected: true,
      },
      {
        description: 'the feature flag is off',
        features: { instructor_survey: false },
        profile: { preferences: { show_instructor_survey: true } },
        expected: false,
      },
      {
        description: 'the feature flag is absent',
        features: {},
        profile: { preferences: { show_instructor_survey: true } },
        expected: false,
      },
      {
        description: 'H is not asking this user',
        features: { instructor_survey: true },
        profile: { preferences: {} },
        expected: false,
      },
      {
        // The dummy profile the store starts with, which is also what a
        // logged-out user looks like.
        description: 'there are no preferences at all',
        features: { instructor_survey: true },
        profile: {},
        expected: false,
      },
    ].forEach(fixture => {
      it(`returns ${fixture.expected} when ${fixture.description}`, () => {
        const result = sessionUtil.shouldShowInstructorSurvey(
          fixture.profile,
          fixture.features,
        );
        assert.equal(result, fixture.expected);
      });
    });
  });
});
