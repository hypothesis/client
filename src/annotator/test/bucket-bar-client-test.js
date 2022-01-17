import { delay } from '../../test-util/wait';
import { BucketBarClient } from '../bucket-bar-client';

describe('BucketBarClient', () => {
  const sandbox = sinon.createSandbox();
  let bucketBarClients;
  let contentContainer;
  let fakeBridge;

  beforeEach(() => {
    sandbox
      .stub(window, 'requestAnimationFrame')
      .callsFake(cb => setTimeout(cb, 0));
    bucketBarClients = [];
    contentContainer = document.createElement('div');
    fakeBridge = { call: sinon.stub() };
  });

  afterEach(() => {
    bucketBarClients.forEach(bucketBarClient => bucketBarClient.destroy());
    contentContainer.remove();
    sandbox.restore();
  });

  const createBucketBarClient = () => {
    const bucketBarClient = new BucketBarClient({
      contentContainer,
      hostRPC: fakeBridge,
    });
    bucketBarClients.push(bucketBarClient);
    return bucketBarClient;
  };

  it('should update buckets when the window is resized', async () => {
    createBucketBarClient();

    window.dispatchEvent(new Event('resize'));
    await delay(0);

    assert.calledOnce(fakeBridge.call);
    assert.calledWith(fakeBridge.call, 'anchorsChanged');
  });

  it('should update buckets when the window is scrolled', async () => {
    createBucketBarClient();

    window.dispatchEvent(new Event('scroll'));
    await delay(0);

    assert.calledOnce(fakeBridge.call);
    assert.calledWith(fakeBridge.call, 'anchorsChanged');
  });

  it('should update buckets when the contentContainer element scrolls', async () => {
    createBucketBarClient();

    contentContainer.dispatchEvent(new Event('scroll'));
    await delay(0);

    assert.calledOnce(fakeBridge.call);
    assert.calledWith(fakeBridge.call, 'anchorsChanged');
  });

  describe('#destroy', () => {
    it('stops listening for events', async () => {
      const bucketBarClient = createBucketBarClient();

      bucketBarClient.destroy();
      contentContainer.dispatchEvent(new Event('scroll'));
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('scroll'));
      await delay(0);

      assert.notCalled(fakeBridge.call);
    });
  });

  describe('#update', () => {
    it('updates if no other update is pending', async () => {
      const bucketBarClient = createBucketBarClient();

      bucketBarClient.update();
      await delay(0);

      assert.calledOnce(fakeBridge.call);
      assert.calledWith(fakeBridge.call, 'anchorsChanged');
    });

    it('does not update if another update is pending', async () => {
      const bucketBarClient = createBucketBarClient();

      bucketBarClient.update();
      bucketBarClient.update();
      await delay(0);

      assert.calledOnce(fakeBridge.call);
      assert.calledWith(fakeBridge.call, 'anchorsChanged');
    });
  });
});
