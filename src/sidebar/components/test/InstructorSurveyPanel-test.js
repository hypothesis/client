import { checkAccessibility, mount } from '@hypothesis/frontend-testing';
import { act } from 'preact/test-utils';

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
    fakeStore = {
      hasSidebarOpened: sinon.stub().returns(true),
      instructorSurveyNudges: sinon.stub().returns(0),
    };

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

  describe('when the user tries to annotate', () => {
    let clock;

    beforeEach(() => {
      clock = sinon.useFakeTimers();
    });

    afterEach(() => {
      clock.restore();
    });

    const card = wrapper => wrapper.find('Card');
    const nudge = (wrapper, count) => {
      fakeStore.instructorSurveyNudges.returns(count);
      // The store is a fake, so re-render by hand -- with a fresh element, since
      // an unchanged one would be skipped -- and use `act` so the effect that
      // reacts to the new count runs before asserting.
      act(() => {
        wrapper.setProps({
          children: <InstructorSurveyPanel rerender={count} />,
        });
      });
      wrapper.update();
    };

    it('pulses and takes focus', () => {
      const wrapper = createComponent();
      document.activeElement.blur();

      nudge(wrapper, 1);

      assert.include(card(wrapper).prop('classes'), 'animate-survey-nudge');
      assert.equal(
        document.activeElement,
        wrapper
          .find('section[data-testid="instructor-survey-panel"]')
          .getDOMNode(),
      );
    });

    it('stops pulsing once the animation is over', () => {
      const wrapper = createComponent();
      nudge(wrapper, 1);

      act(() => {
        clock.tick(800);
      });
      wrapper.update();

      assert.notInclude(card(wrapper).prop('classes'), 'animate-survey-nudge');
    });

    it('pulses again on the next attempt', () => {
      const wrapper = createComponent();
      nudge(wrapper, 1);
      act(() => {
        clock.tick(800);
      });
      wrapper.update();

      nudge(wrapper, 2);

      assert.include(card(wrapper).prop('classes'), 'animate-survey-nudge');
    });

    it('restarts the pulse on an attempt made while it is playing', () => {
      const wrapper = createComponent();
      nudge(wrapper, 1);
      const first = card(wrapper).getDOMNode();

      nudge(wrapper, 2);

      // A fresh element is what makes the browser play the animation again.
      assert.notEqual(card(wrapper).getDOMNode(), first);
      assert.include(card(wrapper).prop('classes'), 'animate-survey-nudge');
    });

    it('does not pulse for attempts made before it mounted', () => {
      fakeStore.instructorSurveyNudges.returns(3);

      const wrapper = createComponent();

      assert.notInclude(card(wrapper).prop('classes'), 'animate-survey-nudge');
    });
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
