import { ThumbnailService } from '../thumbnail';

describe('ThumbnailService', () => {
  let fakeFrameSyncService;

  beforeEach(async () => {
    const data = new ImageData(32, 32);
    const bitmap = await createImageBitmap(data);
    fakeFrameSyncService = {
      requestThumbnail: sinon.stub().resolves(bitmap),
    };
  });

  const createService = () => new ThumbnailService(fakeFrameSyncService);

  describe('#get', () => {
    it('returns `null` if no thumbnail is cached', () => {
      const svc = createService();
      assert.isNull(svc.get('ann123'));
    });

    it('returns thumbnail if cached', async () => {
      const svc = createService();
      await svc.fetch('ann123');
      assert.instanceOf(svc.get('ann123'), ImageBitmap);
    });
  });

  describe('#fetch', () => {
    it('requests thumbnail if not cached', async () => {
      const svc = createService();
      const opts = {};
      await svc.fetch('ann123', opts);
      assert.calledWith(fakeFrameSyncService.requestThumbnail, 'ann123', opts);
    });

    it('returns thumbnail if cached', async () => {
      const svc = createService();
      await svc.fetch('ann123');

      fakeFrameSyncService.requestThumbnail.resetHistory();
      await svc.fetch('ann123');

      assert.notCalled(fakeFrameSyncService.requestThumbnail);
    });
  });
});
