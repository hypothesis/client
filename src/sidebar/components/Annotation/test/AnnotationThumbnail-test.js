import { mount, waitForElement } from '@hypothesis/frontend-testing';

import AnnotationThumbnail from '../AnnotationThumbnail';

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
    );
  };

  beforeEach(async () => {
    const imageData = new ImageData(32, 32);
    fakeThumbnail = await createImageBitmap(imageData);
    fakeThumbnailService = {
      get: sinon.stub().returns(null),
      fetch: sinon.stub().resolves(fakeThumbnail),
    };
  });

  it('renders a placeholder if thumbnail is not available', () => {
    const wrapper = createComponent();
    assert.isFalse(wrapper.exists('BitmapImage'));
    assert.isTrue(wrapper.exists('[data-testid="placeholder"]'));
  });

  it('renders thumbnail immediately if cached', () => {
    fakeThumbnailService.get.returns(fakeThumbnail);
    const wrapper = createComponent();
    assert.isFalse(wrapper.exists('[data-testid="placeholder"]'));
    assert.isTrue(wrapper.exists('BitmapImage'));
  });

  it('requests thumbnail and then renders it if not cached', async () => {
    const wrapper = createComponent();
    assert.calledOnce(fakeThumbnailService.fetch);
    const thumbnail = await waitForElement(wrapper, 'BitmapImage');
    assert.equal(thumbnail.prop('bitmap'), fakeThumbnail);
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
