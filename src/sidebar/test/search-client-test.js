import SearchClient from '../search-client';

function awaitEvent(emitter, event) {
  return new Promise(function (resolve) {
    emitter.on(event, resolve);
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const RESULTS = [
  { id: 'one', created: '2020-01-01', updated: '2020-01-01' },
  { id: 'two', created: '2020-01-02', updated: '2020-01-02' },
  { id: 'three', created: '2020-01-03', updated: '2020-01-03' },
  { id: 'four', created: '2020-01-04', updated: '2020-01-04' },
];

/**
 * Fake implementation of the `/api/search` API
 */
async function executeSearch(params) {
  assert.isTrue(['asc', 'desc'].includes(params.order));
  assert.isTrue(['created', 'updated'].includes(params.sort));
  assert.typeOf(params.limit, 'number');

  let rows = params.search_after
    ? RESULTS.filter(ann => {
        if (params.order === 'asc') {
          return ann[params.sort] > params.search_after;
        } else {
          return ann[params.sort] < params.search_after;
        }
      })
    : RESULTS.slice();

  rows = rows
    .sort((a, b) => {
      const keyA = a[params.sort];
      const keyB = b[params.sort];

      if (keyA === keyB) {
        return 0;
      }

      if (params.order === 'asc') {
        return keyA < keyB ? -1 : 1;
      } else {
        return keyA > keyB ? -1 : 1;
      }
    })
    .slice(0, params.limit);

  return {
    rows,
    total: RESULTS.length,
  };
}

describe('SearchClient', () => {
  let fakeSearchFn;

  beforeEach(() => {
    fakeSearchFn = sinon.spy(executeSearch);
  });

  it('emits "results"', () => {
    const client = new SearchClient(fakeSearchFn);
    const onResults = sinon.stub();
    client.on('results', onResults);
    client.get({ uri: 'http://example.com' });
    return awaitEvent(client, 'end').then(() => {
      assert.calledWith(onResults, RESULTS);
    });
  });

  it('emits "resultCount"', () => {
    const client = new SearchClient(fakeSearchFn);
    const onResultCount = sinon.stub();
    client.on('resultCount', onResultCount);
    client.get({ uri: 'http://example.com' });
    return awaitEvent(client, 'end').then(() => {
      assert.calledWith(onResultCount, RESULTS.length);
    });
  });

  it('emits "end" only once', () => {
    const client = new SearchClient(fakeSearchFn, { chunkSize: 2 });
    client.on('results', sinon.stub());
    let emitEndCounter = 0;
    client.on('end', () => {
      emitEndCounter += 1;
      assert.equal(emitEndCounter, 1);
    });
    client.get({ uri: 'http://example.com' });
  });

  it('emits "results" with chunks in incremental mode', () => {
    const client = new SearchClient(fakeSearchFn, { chunkSize: 2 });
    const onResults = sinon.stub();
    client.on('results', onResults);
    client.get({ uri: 'http://example.com' });
    return awaitEvent(client, 'end').then(() => {
      assert.calledWith(onResults, RESULTS.slice(0, 2));
      assert.calledWith(onResults, RESULTS.slice(2, 4));
    });
  });

  it('emits "resultCount" only once in incremental mode', () => {
    const client = new SearchClient(fakeSearchFn, { chunkSize: 2 });
    const onResultCount = sinon.stub();
    client.on('resultCount', onResultCount);
    client.get({ uri: 'http://example.com' });
    return awaitEvent(client, 'end').then(() => {
      assert.calledWith(onResultCount, RESULTS.length);
      assert.calledOnce(onResultCount);
    });
  });

  it('emits "results" once in non-incremental mode', () => {
    const client = new SearchClient(fakeSearchFn, {
      chunkSize: 2,
      incremental: false,
    });
    const onResults = sinon.stub();
    client.on('results', onResults);
    client.get({ uri: 'http://example.com' });
    return awaitEvent(client, 'end').then(() => {
      assert.calledOnce(onResults);
      assert.calledWith(onResults, RESULTS);
    });
  });

  it('does not emit "results" if canceled', () => {
    const client = new SearchClient(fakeSearchFn);
    const onResults = sinon.stub();
    const onEnd = sinon.stub();
    client.on('results', onResults);
    client.on('end', onEnd);
    client.get({ uri: 'http://example.com' });
    client.cancel();
    return Promise.resolve().then(() => {
      assert.notCalled(onResults);
      assert.called(onEnd);
    });
  });

  it('emits "error" event if search fails', () => {
    const err = new Error('search failed');
    fakeSearchFn = () => {
      return Promise.reject(err);
    };
    const client = new SearchClient(fakeSearchFn);
    const onError = sinon.stub();
    client.on('error', onError);
    client.get({ uri: 'http://example.com' });
    return awaitEvent(client, 'end').then(() => {
      assert.calledWith(onError, err);
    });
  });

  it('does not emit "error" event if search is canceled before it fails', async () => {
    fakeSearchFn = () => Promise.reject(new Error('search failed'));
    const client = new SearchClient(fakeSearchFn);
    const onError = sinon.stub();
    client.on('error', onError);

    client.get({ uri: 'http://example.com' });
    client.cancel();
    await delay(0);

    assert.notCalled(onError);
  });

  context('`maxResults` option present', () => {
    it('emits error if results size exceeds `maxResults`', () => {
      const client = new SearchClient(fakeSearchFn, { maxResults: 2 });
      const onError = sinon.stub();
      client.on('error', onError);

      client.get({ uri: 'http://example.com' });

      return awaitEvent(client, 'end').then(() => {
        assert.calledOnce(onError);
        assert.equal(
          onError.getCall(0).args[0].message,
          'Results size exceeds maximum allowed annotations'
        );
      });
    });

    it('does not emit an error if results size is <= `maxResults`', () => {
      const client = new SearchClient(fakeSearchFn, { maxResults: 20 });
      const onError = sinon.stub();
      client.on('error', onError);

      client.get({ uri: 'http://example.com' });

      return awaitEvent(client, 'end').then(() => {
        assert.notCalled(onError);
      });
    });
  });

  it('fetches annotations by earliest creation date if `sortBy` and `sortOrder` not set', async () => {
    const client = new SearchClient(fakeSearchFn);

    client.get({ uri: 'http://example.com' });
    await awaitEvent(client, 'end');

    const params = fakeSearchFn.getCall(0).args[0];
    assert.equal(params.sort, 'created');
    assert.equal(params.order, 'asc');
  });

  it('fetches annotations in specified order if `sortBy` and `sortOrder` are set', async () => {
    const client = new SearchClient(fakeSearchFn, {
      sortBy: 'updated',
      sortOrder: 'desc',
    });

    client.get({ uri: 'http://example.com' });
    await awaitEvent(client, 'end');

    const params = fakeSearchFn.getCall(0).args[0];
    assert.equal(params.sort, 'updated');
    assert.equal(params.order, 'desc');
  });
});
