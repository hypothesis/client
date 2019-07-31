'use strict';

const annotations = require('../annotations');
const EventEmitter = require('tiny-emitter');

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

describe('annotations', () => {
  let fakeStore;
  let fakeApi;
  let fakeAnnotationMapper;
  let fakeStreamer;
  let fakeStreamFilter;

  let fakeUris;
  let fakeGroupId;

  beforeEach(() => {
    sinon.stub(console, 'error');
    searchClients = [];
    longRunningSearchClient = false;
    fakeAnnotationMapper = {
      loadAnnotations: sinon.stub(),
      unloadAnnotations: sinon.stub(),
    };
    fakeApi = {
      search: sinon.stub(),
    };
    fakeStore = {
      getState: sinon.stub(),
      frames: sinon.stub(),
      searchUris: sinon.stub(),
      savedAnnotations: sinon.stub(),
      hasSelectedAnnotations: sinon.stub(),
      updateFrameAnnotationFetchStatus: sinon.stub(),
      annotationFetchStarted: sinon.stub(),
      annotationFetchFinished: sinon.stub(),
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
    fakeGroupId = 'group-id';

    annotations.$imports.$mock({
      '../search-client': FakeSearchClient,
    });
  });

  afterEach(() => {
    console.error.restore();
    annotations.$imports.$restore();
  });

  function service() {
    fakeStore.frames.returns(
      fakeUris.map(uri => {
        return { uri: uri };
      })
    );
    return annotations(
      fakeAnnotationMapper,
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
      const svc = service();

      svc.load(fakeUris, fakeGroupId);
      assert.calledWith(fakeAnnotationMapper.unloadAnnotations, [
        sinon.match({ id: fakeUris[0] + '123' }),
        sinon.match({ id: fakeUris[0] + '456' }),
      ]);
    });

    it('loads all annotations for a URI', () => {
      const svc = service();

      svc.load(fakeUris, fakeGroupId);
      assert.calledWith(fakeAnnotationMapper.loadAnnotations, [
        sinon.match({ id: fakeUris[0] + '123' }),
      ]);
      assert.calledWith(fakeAnnotationMapper.loadAnnotations, [
        sinon.match({ id: fakeUris[0] + '456' }),
      ]);
    });

    it('loads all annotations for a frame with multiple URIs', () => {
      const uri = 'http://example.com/test.pdf';
      const fingerprint = 'urn:x-pdf:fingerprint';
      fakeUris = [uri, fingerprint];
      const svc = service();
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
      assert.calledWith(fakeAnnotationMapper.loadAnnotations, [
        sinon.match({ id: uri + '123' }),
      ]);
      assert.calledWith(fakeAnnotationMapper.loadAnnotations, [
        sinon.match({ id: fingerprint + '123' }),
      ]);
      assert.calledWith(fakeAnnotationMapper.loadAnnotations, [
        sinon.match({ id: uri + '456' }),
      ]);
      assert.calledWith(fakeAnnotationMapper.loadAnnotations, [
        sinon.match({ id: fingerprint + '456' }),
      ]);
    });

    it('loads all annotations for all URIs', () => {
      fakeUris = ['http://example.com', 'http://foobar.com'];
      const svc = service();

      svc.load(fakeUris, fakeGroupId);

      [
        fakeUris[0] + '123',
        fakeUris[0] + '456',
        fakeUris[1] + '123',
        fakeUris[1] + '456',
      ].forEach(uri => {
        assert.calledWith(fakeAnnotationMapper.loadAnnotations, [
          sinon.match({ id: uri }),
        ]);
      });
    });

    it('updates annotation fetch status for all frames', () => {
      fakeUris = ['http://example.com', 'http://foobar.com'];
      const svc = service();

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
      const svc = service();

      svc.load(fakeUris, fakeGroupId);
      assert.calledWith(searchClients[0].get, {
        uri: fakeUris,
        group: fakeGroupId,
      });
    });

    it('loads annotations in batches', () => {
      const svc = service();

      svc.load(fakeUris, fakeGroupId);
      assert.ok(searchClients[0].incremental);
    });

    it("cancels previously search client if it's still running", () => {
      const svc = service();

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
      const svc = service();

      svc.load(fakeUris, fakeGroupId);
      assert.notCalled(fakeAnnotationMapper.loadAnnotations);
    });

    it('calls annotationFetchStarted when it starts searching for annotations', () => {
      const svc = service();

      svc.load(fakeUris, fakeGroupId);

      assert.calledOnce(fakeStore.annotationFetchStarted);
    });

    it('calls annotationFetchFinished when all annotations have been found', () => {
      const svc = service();

      svc.load(fakeUris, fakeGroupId);

      assert.calledOnce(fakeStore.annotationFetchFinished);
    });

    it('logs an error to the console if the search client runs into an error', () => {
      const svc = service();
      const error = new Error('search for annotations failed');

      svc.load(fakeUris, fakeGroupId);
      searchClients[0].emit('error', error);

      assert.calledWith(console.error, error);
    });
  });
});
