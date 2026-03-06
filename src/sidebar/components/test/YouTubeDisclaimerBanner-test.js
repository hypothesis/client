import { mount } from '@hypothesis/frontend-testing';

import { ServiceContext } from '../../service-context';
import YouTubeDisclaimerBanner from '../YouTubeDisclaimerBanner';

describe('YouTubeDisclaimerBanner', () => {
  let fakeSessionService;

  function createComponent() {
    const injector = {
      get: sinon.stub().withArgs('session').returns(fakeSessionService),
    };
    return mount(
      <ServiceContext.Provider value={injector}>
        <YouTubeDisclaimerBanner />
      </ServiceContext.Provider>,
    );
  }

  beforeEach(() => {
    fakeSessionService = { dismissYoutubeDisclaimer: sinon.stub().resolves() };
  });

  it('displays the YouTube disclaimer text', () => {
    const wrapper = createComponent();
    const text = wrapper.text();
    assert.include(text, 'This activity includes embedded YouTube videos');
    assert.include(text, 'Hypothesis does not control whether YouTube');
    assert.include(text, 'Your institution may choose to disable');
  });

  it('shows a Dismiss button', () => {
    const wrapper = createComponent();
    const dismissButton = wrapper.find(
      'Button[data-testid="youtube-disclaimer-dismiss"]',
    );
    assert.equal(dismissButton.length, 1);
    assert.include(dismissButton.text(), 'Dismiss');
  });

  it('calls session.dismissYoutubeDisclaimer when Dismiss is clicked', () => {
    const wrapper = createComponent();
    const dismissButton = wrapper.find(
      'Button[data-testid="youtube-disclaimer-dismiss"]',
    );
    dismissButton.props().onClick();
    assert.calledOnce(fakeSessionService.dismissYoutubeDisclaimer);
  });
});
