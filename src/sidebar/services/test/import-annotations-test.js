import { ImportAnnotationsService } from '../import-annotations';

describe('ImportAnnotationsService', () => {
  let counter;
  let fakeStore;
  let fakeToastMessenger;
  let fakeAnnotationsService;

  beforeEach(() => {
    counter = 0;

    fakeStore = {
      allAnnotations: sinon.stub().returns([]),
      beginImport: sinon.stub(),
      completeImport: sinon.stub(),
    };

    fakeToastMessenger = {
      success: sinon.stub(),
      notice: sinon.stub(),
      error: sinon.stub(),
    };

    fakeAnnotationsService = {
      annotationFromData: sinon.stub().callsFake(data => {
        return {
          $tag: 'dummy',
          ...data,
        };
      }),
      save: sinon.stub().resolves({}),
    };
  });

  function createService() {
    return new ImportAnnotationsService(
      fakeStore,
      fakeAnnotationsService,
      fakeToastMessenger,
    );
  }

  function generateAnnotation(fields = {}) {
    ++counter;
    return {
      uri: 'https://example.com',
      target: [
        {
          source: 'https://example.com',
        },
      ],
      text: `Annotation ${counter}`,
      tags: ['foo'],
      document: { title: 'Example' },
      ...fields,
    };
  }

  describe('#import', () => {
    it('increments count of pending imports', async () => {
      const svc = createService();
      const done = svc.import([generateAnnotation()]);
      assert.calledWith(fakeStore.beginImport, 1);
      await done;
    });

    it('decrements count of pending imports as they complete', async () => {
      const svc = createService();
      const done = svc.import([generateAnnotation()]);
      assert.notCalled(fakeStore.completeImport);
      await done;
      assert.calledWith(fakeStore.completeImport, 1);
    });

    it('generates annotation payloads and saves them', async () => {
      const svc = createService();
      const ann = generateAnnotation();

      await svc.import([ann]);

      assert.calledWith(fakeAnnotationsService.save, {
        $tag: 'dummy',
        ...ann,
      });
    });

    it('does not skip annotation if existing annotations in store differ', async () => {
      const svc = createService();
      const ann = generateAnnotation();

      fakeStore.allAnnotations.returns([
        { ...ann, text: 'Different text' },
        { ...ann, tags: ['different-tag'] },
      ]);
      await svc.import([ann]);

      assert.calledWith(fakeToastMessenger.success, '1 annotations imported');
    });

    // TODO - Test for matching based on tags, text, quote.
    it('skips annotations with content that matches existing annotations in the store', async () => {
      const svc = createService();
      const ann = generateAnnotation();

      fakeStore.allAnnotations.returns([ann]);
      await svc.import([ann]);

      assert.calledWith(fakeToastMessenger.notice, '1 duplicates skipped');
    });

    it('shows a success toast if import succeeds', async () => {
      const svc = createService();
      await svc.import([generateAnnotation(), generateAnnotation()]);
      assert.calledWith(fakeToastMessenger.success, '2 annotations imported');
    });

    it('shows a warning toast if some errors occurred', async () => {
      const svc = createService();
      fakeAnnotationsService.save.onCall(0).resolves({});
      fakeAnnotationsService.save.onCall(1).rejects(new Error('Oh no'));

      await svc.import([generateAnnotation(), generateAnnotation()]);

      assert.calledWith(
        fakeToastMessenger.notice,
        '1 annotations imported, 1 imports failed',
      );
    });

    it('shows an error toast if all imports failed', async () => {
      const svc = createService();
      fakeAnnotationsService.save.rejects(new Error('Something went wrong'));

      await svc.import([generateAnnotation(), generateAnnotation()]);

      assert.calledWith(fakeToastMessenger.error, '2 imports failed');
    });
  });
});
