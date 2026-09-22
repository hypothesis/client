import { checkAccessibility, mount } from '@hypothesis/frontend-testing';

import { ServiceContext } from '../../service-context';
import InstructorSurveyPanel, { $imports } from '../InstructorSurveyPanel';

describe('InstructorSurveyPanel', () => {
  let fakeAnalyticsService;
  let fakeSessionService;
  let fakeStore;

  function createComponent() {
    const services = {
      analytics: fakeAnalyticsService,
      session: fakeSessionService,
    };
    const injector = { get: name => services[name] };
    return mount(
      <ServiceContext.Provider value={injector}>
        <InstructorSurveyPanel />
      </ServiceContext.Provider>,
      { connected: true },
    );
  }

  beforeEach(() => {
    fakeAnalyticsService = { trackEvent: sinon.stub() };
    fakeSessionService = {
      submitInstructorSurveyResponse: sinon.stub().resolves(),
    };
    // The panel only counts as seen once the sidebar has been opened; most
    // tests want it already open.
    fakeStore = { hasSidebarOpened: sinon.stub().returns(true) };

    $imports.$mock({
      '../store': { useSidebarStore: () => fakeStore },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('asks the question', () => {
    const wrapper = createComponent();
    assert.include(wrapper.text(), 'Are you a course instructor?');
  });

  it('tracks an impression once the sidebar has been opened', () => {
    const wrapper = createComponent();

    assert.calledOnce(fakeAnalyticsService.trackEvent);
    assert.calledWith(
      fakeAnalyticsService.trackEvent,
      'client.survey.instructor_role.shown',
    );

    wrapper.setProps({});
    assert.calledOnce(fakeAnalyticsService.trackEvent);
  });

  it('moves focus to the panel', () => {
    const wrapper = createComponent();
    assert.equal(
      document.activeElement,
      wrapper
        .find('section[data-testid="instructor-survey-panel"]')
        .getDOMNode(),
    );
  });

  it('does not track an impression while the sidebar is closed', () => {
    // The sidebar iframe is created at page load and starts collapsed, so the
    // panel mounts without anyone having seen it.
    fakeStore.hasSidebarOpened.returns(false);

    createComponent();

    assert.notCalled(fakeAnalyticsService.trackEvent);
  });

  it('does not move focus while the sidebar is closed', () => {
    fakeStore.hasSidebarOpened.returns(false);

    const wrapper = createComponent();

    assert.notEqual(
      document.activeElement,
      wrapper
        .find('section[data-testid="instructor-survey-panel"]')
        .getDOMNode(),
    );
  });

  [
    {
      selector: 'Button[data-testid="instructor-survey-yes"]',
      response: 'instructor',
    },
    {
      selector: 'Button[data-testid="instructor-survey-no"]',
      response: 'not_instructor',
    },
    // Dismissing is an answer like the other two, not an absence of one.
    {
      selector: 'CloseButton[data-testid="instructor-survey-dismiss"]',
      response: 'dismissed',
    },
  ].forEach(({ selector, response }) => {
    it(`submits "${response}"`, () => {
      const wrapper = createComponent();

      wrapper.find(selector).props().onClick();

      assert.calledOnce(fakeSessionService.submitInstructorSurveyResponse);
      assert.calledWith(
        fakeSessionService.submitInstructorSurveyResponse,
        response,
      );
    });
  });

  it('disables every action while an answer is in flight', async () => {
    let resolveSubmit;
    fakeSessionService.submitInstructorSurveyResponse.returns(
      new Promise(resolve => {
        resolveSubmit = resolve;
      }),
    );
    const wrapper = createComponent();

    wrapper
      .find('Button[data-testid="instructor-survey-yes"]')
      .props()
      .onClick();
    wrapper.update();

    for (const selector of [
      'Button[data-testid="instructor-survey-yes"]',
      'Button[data-testid="instructor-survey-no"]',
      'CloseButton[data-testid="instructor-survey-dismiss"]',
    ]) {
      assert.isTrue(
        wrapper.find(selector).prop('disabled'),
        `${selector} should be disabled`,
      );
    }

    resolveSubmit();
  });

  it('re-enables the actions when submitting fails', async () => {
    fakeSessionService.submitInstructorSurveyResponse.rejects(
      new Error('API error'),
    );
    const wrapper = createComponent();

    await wrapper
      .find('Button[data-testid="instructor-survey-yes"]')
      .props()
      .onClick();
    wrapper.update();

    // The service has shown a toast; the panel stays up so the answer can be
    // given again.
    assert.isFalse(
      wrapper
        .find('Button[data-testid="instructor-survey-yes"]')
        .prop('disabled'),
    );
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => createComponent(),
    }),
  );
});
