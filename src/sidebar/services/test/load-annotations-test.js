import EventEmitter from 'tiny-emitter';

import loadAnnotationsService, { $imports } from '../load-annotations';

let searchClients;
let longRunningSearchClient = false;
class FakeSearchClient extends EventEmitter {
  constructor(searchFn, opts) {
    super();

    assert.ok(searchFn);
    searchClients.push(this);
    this.cancel = sinon.stub();
    this.incremental = !!opts.incremental;

    this.get = sinon.spy(query => {
      assert.ok(query.uri);

      for (let i = 0; i < query.uri.length; i++) {
        const uri = query.uri[i];
        this.emit('results', [{ id: uri + '123', group: '__world__' }]);
        this.emit('results', [{ id: uri + '456', group: 'private-group' }]);
      }
      if (!longRunningSearchClient) {
        this.emit('end');
      }
    });
  }
}

describe('loadAnnotationsService', () => {
  let fakeApi;
  let fakeStore;
  let fakeStreamer;
  let fakeStreamFilter;

  const fakeGroupId = 'group-id';
  let fakeUris;

  beforeEach(() => {
    sinon.stub(console, 'error');
    searchClients = [];
    longRunningSearchClient = false;

    fakeApi = {
      search: sinon.stub(),
    };

    fakeStore = {
      addAnnotations: sinon.stub(),
      annotationFetchFinished: sinon.stub(),
      annotationFetchStarted: sinon.stub(),
      frames: sinon.stub(),
      removeAnnotations: sinon.stub(),
      savedAnnotations: sinon.stub(),
      updateFrameAnnotationFetchStatus: sinon.stub(),
    };

    fakeStreamer = {
      setConfig: sinon.stub(),
      connect: sinon.stub(),
      reconnect: sinon.stub(),
    };
    fakeStreamFilter = {
      resetFilter: sinon.stub().returns({
        addClause: sinon.stub(),
      }),
      getFilter: sinon.stub().returns({}),
    };

    fakeUris = ['http://example.com'];
    $imports.$mock({
      '../search-client': FakeSearchClient,
    });
  });

  afterEach(() => {
    console.error.restore();
    $imports.$restore();
  });

  function createService() {
    fakeStore.frames.returns(
      fakeUris.map(uri => {
        return { uri: uri };
      })
    );
    return loadAnnotationsService(
      fakeApi,
      fakeStore,
      fakeStreamer,
      fakeStreamFilter
    );
  }

  describe('load', () => {
    it('unloads any existing annotations', () => {
      // When new clients connect, all existing annotations should be unloaded
      // before reloading annotations for each currently-connected client.
      fakeStore.savedAnnotations.returns([
        { id: fakeUris[0] + '123' },
        { id: fakeUris[0] + '456' },
      ]);
      const svc = createService();

      svc.load(fakeUris, fakeGroupId);
      assert.calledWith(fakeStore.removeAnnotations, [
        sinon.match({ id: fakeUris[0] + '123' }),
        sinon.match({ id: fakeUris[0] + '456' }),
      ]);
    });

    it('loads all annotations for a URI', () => {
      const svc = createService();

      svc.load(fakeUris, fakeGroupId);
      assert.calledWith(fakeStore.addAnnotations, [
        sinon.match({ id: fakeUris[0] + '123' }),
      ]);
      assert.calledWith(fakeStore.addAnnotations, [
        sinon.match({ id: fakeUris[0] + '456' }),
      ]);
    });

    it('loads all annotations for a frame with multiple URIs', () => {
      const uri = 'http://example.com/test.pdf';
      const fingerprint = 'urn:x-pdf:fingerprint';
      fakeUris = [uri, fingerprint];
      const svc = createService();
      // Override the default frames set by the service call above.
      fakeStore.frames.returns([
        {
          uri: uri,
          metadata: {
            documentFingerprint: 'fingerprint',
            link: [
              {
                href: fingerprint,
              },
              {
                href: uri,
              },
            ],
          },
        },
      ]);

      svc.load(fakeUris, fakeGroupId);
      assert.calledWith(fakeStore.addAnnotations, [
        sinon.match({ id: uri + '123' }),
      ]);
      assert.calledWith(fakeStore.addAnnotations, [
        sinon.match({ id: fingerprint + '123' }),
      ]);
      assert.calledWith(fakeStore.addAnnotations, [
        sinon.match({ id: uri + '456' }),
      ]);
      assert.calledWith(fakeStore.addAnnotations, [
        sinon.match({ id: fingerprint + '456' }),
      ]);
    });

    it('loads all annotations for all URIs', () => {
      fakeUris = ['http://example.com', 'http://foobar.com'];
      const svc = createService();

      svc.load(fakeUris, fakeGroupId);

      [
        fakeUris[0] + '123',
        fakeUris[0] + '456',
        fakeUris[1] + '123',
        fakeUris[1] + '456',
      ].forEach(uri => {
        assert.calledWith(fakeStore.addAnnotations, [sinon.match({ id: uri })]);
      });
    });

    it('updates annotation fetch status for all frames', () => {
      fakeUris = ['http://example.com', 'http://foobar.com'];
      const svc = createService();

      svc.load(fakeUris, fakeGroupId);
      assert.calledWith(
        fakeStore.updateFrameAnnotationFetchStatus,
        fakeUris[0],
        true
      );
      assert.calledWith(
        fakeStore.updateFrameAnnotationFetchStatus,
        fakeUris[1],
        true
      );
    });

    it('fetches annotations for the specified group', () => {
      const svc = createService();

      svc.load(fakeUris, fakeGroupId);
      assert.calledWith(searchClients[0].get, {
        uri: fakeUris,
        group: fakeGroupId,
      });
    });

    it('loads annotations in batches', () => {
      const svc = createService();

      svc.load(fakeUris, fakeGroupId);
      assert.ok(searchClients[0].incremental);
    });

    it("cancels previously search client if it's still running", () => {
      const svc = createService();

      // Issue a long running load annotations request.
      longRunningSearchClient = true;
      svc.load(fakeUris, fakeGroupId);
      // Issue another load annotations request while the
      // previous annotation load is still running.
      svc.load(fakeUris, fakeGroupId);

      assert.calledOnce(searchClients[0].cancel);
    });

    it('does not load annotations if URIs list is empty', () => {
      fakeUris = [];
      const svc = createService();

      svc.load(fakeUris, fakeGroupId);
      assert.notCalled(fakeStore.addAnnotations);
    });

    it('calls annotationFetchStarted when it starts searching for annotations', () => {
      const svc = createService();

      svc.load(fakeUris, fakeGroupId);

      assert.calledOnce(fakeStore.annotationFetchStarted);
    });

    it('calls annotationFetchFinished when all annotations have been found', () => {
      const svc = createService();

      svc.load(fakeUris, fakeGroupId);

      assert.calledOnce(fakeStore.annotationFetchFinished);
    });

    it('logs an error to the console if the search client runs into an error', () => {
      const svc = createService();
      const error = new Error('search for annotations failed');

      svc.load(fakeUris, fakeGroupId);
      searchClients[0].emit('error', error);

      assert.calledWith(console.error, error);
    });
  });
});
