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
      assert.ok(svc.get('ann123'));
    });

    it('moves thumbnail to back of least-recently-used list', async () => {
      const svc = createService();
      await svc.fetch('ann0');
      await svc.fetch('ann1');
      assert.deepEqual(svc.cachedThumbnailTags(), ['ann0', 'ann1']);

      svc.get('ann0');

      assert.deepEqual(svc.cachedThumbnailTags(), ['ann1', 'ann0']);
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

    it('prunes old entries from thumbnail cache', async () => {
      const svc = createService();
      svc.cacheSize = 3;
      assert.equal(svc.cacheSize, 3);

      await svc.fetch('ann0');
      await svc.fetch('ann1');
      await svc.fetch('ann2');
      assert.deepEqual(svc.cachedThumbnailTags(), ['ann0', 'ann1', 'ann2']);

      await svc.fetch('ann3');
      assert.deepEqual(svc.cachedThumbnailTags(), ['ann1', 'ann2', 'ann3']);

      await svc.fetch('ann4');
      assert.deepEqual(svc.cachedThumbnailTags(), ['ann2', 'ann3', 'ann4']);
    });
  });
});
