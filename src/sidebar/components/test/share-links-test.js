import { mount } from 'enzyme';
import { createElement } from 'preact';

import ShareLinks from '../share-links';
import { $imports } from '../share-links';

import { checkAccessibility } from '../../../test-util/accessibility';
import mockImportedComponents from '../../../test-util/mock-imported-components';

describe('ShareLinks', () => {
  let fakeAnalytics;
  const shareLink =
    'https://hyp.is/go?url=https%3A%2F%2Fwww.example.com&group=testprivate';

  const createComponent = props =>
    mount(
      <ShareLinks
        analyticsEventName="potato-peeling"
        analytics={fakeAnalytics}
        shareURI={shareLink}
        {...props}
      />
    );

  beforeEach(() => {
    fakeAnalytics = {
      track: sinon.stub(),
    };

    $imports.$mock(mockImportedComponents());
  });

  afterEach(() => {
    $imports.$restore();
  });

  const encodedLink = encodeURIComponent(shareLink);
  const encodedSubject = encodeURIComponent("Let's Annotate");

  [
    {
      service: 'facebook',
      expectedURI: `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}`,
      title: 'Share on Facebook',
    },
    {
      service: 'twitter',
      expectedURI: `https://twitter.com/intent/tweet?url=${encodedLink}&hashtags=annotated`,
      title: 'Tweet share link',
    },
    {
      service: 'email',
      expectedURI: `mailto:?subject=${encodedSubject}&body=${encodedLink}`,
      title: 'Share via email',
    },
  ].forEach(testCase => {
    it(`creates a share link for ${testCase.service} and tracks clicks`, () => {
      const wrapper = createComponent({ shareURI: shareLink });

      const link = wrapper.find(`a[title="${testCase.title}"]`);

      assert.equal(link.prop('href'), testCase.expectedURI);

      // Assure tracking doesn't happen until clicked
      // See https://github.com/hypothesis/client/issues/1566
      assert.notCalled(fakeAnalytics.track);

      // Now click...
      link.simulate('click');

      assert.calledWith(
        fakeAnalytics.track,
        'potato-peeling',
        testCase.service
      );
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => createComponent(),
    })
  );
});
