import {
  checkAccessibility,
  mockImportedComponents,
} from '@hypothesis/frontend-testing';
import { mount } from '@hypothesis/frontend-testing';

import ShareLinks, { $imports } from '../ShareLinks';

describe('ShareLinks', () => {
  const shareLink =
    'https://hyp.is/go?url=https%3A%2F%2Fwww.example.com&group=testprivate';

  const createComponent = props =>
    mount(<ShareLinks shareURI={shareLink} {...props} />);

  beforeEach(() => {
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
    it(`creates a share link for ${testCase.service}`, () => {
      const wrapper = createComponent({ shareURI: shareLink });

      const link = wrapper.find(`a[title="${testCase.title}"]`);

      assert.equal(link.prop('href'), testCase.expectedURI);
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => createComponent(),
    }),
  );
});
