import {
  mockImportedComponents,
  mount,
  waitForElement,
} from '@hypothesis/frontend-testing';

import AnnotationThumbnail, { $imports } from '../AnnotationThumbnail';

describe('AnnotationThumbnail', () => {
  let fakeThumbnail;
  let fakeThumbnailService;

  const createComponent = (props = {}) => {
    return mount(
      <AnnotationThumbnail
        tag="ann123"
        thumbnailService={fakeThumbnailService}
        {...props}
      />,
      { connected: true },
    );
  };

  beforeEach(async () => {
    fakeThumbnail = { url: 'blob:1234', width: 256, height: 256 };
    fakeThumbnailService = {
      get: sinon.stub().returns(null),
      fetch: sinon.stub().resolves(fakeThumbnail),
    };

    $imports.$mock(mockImportedComponents());
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('renders a placeholder if thumbnail is not available', () => {
    const wrapper = createComponent();
    assert.isFalse(wrapper.exists('img'));
    assert.isTrue(wrapper.exists('[data-testid="placeholder"]'));
  });

  it('renders thumbnail immediately if cached', () => {
    fakeThumbnailService.get.returns(fakeThumbnail);
    const wrapper = createComponent();
    assert.isFalse(wrapper.exists('[data-testid="placeholder"]'));
    assert.isTrue(wrapper.exists('img'));
  });

  [
    // No alt text
    {
      expectedAlt: undefined,
    },
    // Text extracted from image
    {
      textInImage: 'Foo bar',
      expectedAlt: 'Foo bar',
    },
    // Explicitly provided description
    {
      description: 'Foo bar',
      textInImage: 'Some text',
      expectedAlt: 'Foo bar',
    },
  ].forEach(({ textInImage, description, expectedAlt }) => {
    it('sets alt text for thumbnail', () => {
      fakeThumbnailService.get.returns(fakeThumbnail);
      const wrapper = createComponent({ description, textInImage });
      const image = wrapper.find('img');
      assert.equal(image.prop('alt'), expectedAlt);
    });
  });

  it('shows description as visible text when showDescription is true', () => {
    const description = 'An image';
    fakeThumbnailService.get.returns(fakeThumbnail);
    const wrapper = createComponent({ description, showDescription: true });

    const excerpt = wrapper.find('Excerpt');
    assert.isTrue(excerpt.exists());
    assert.include(excerpt.text(), description);
  });

  it('does not show description text when showDescription is false', () => {
    const description = 'An image';
    fakeThumbnailService.get.returns(fakeThumbnail);
    const wrapper = createComponent({ description, showDescription: false });

    const excerpt = wrapper.find('Excerpt');
    assert.isFalse(excerpt.exists());
  });

  it('does not show description text when there is no alt text', () => {
    fakeThumbnailService.get.returns(fakeThumbnail);
    const wrapper = createComponent({ showDescription: true });

    const excerpt = wrapper.find('Excerpt');
    assert.isFalse(excerpt.exists());
  });

  it('requests thumbnail and then renders it if not cached', async () => {
    const wrapper = createComponent();
    assert.calledOnce(fakeThumbnailService.fetch);
    const thumbnail = await waitForElement(wrapper, 'img');
    assert.equal(thumbnail.prop('src'), fakeThumbnail.url);
  });

  it('renders error indicator if thumbnail rendering failed', async () => {
    fakeThumbnailService.fetch.rejects(new Error('Something went wrong'));
    const wrapper = createComponent();
    await new Promise(resolve => setTimeout(resolve, 1));
    const error = await waitForElement(wrapper, '[data-testid="error"]');
    assert.equal(
      error.text(),
      'Unable to render thumbnail: Something went wrong',
    );
  });
});
