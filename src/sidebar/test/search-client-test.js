import { delay } from '@hypothesis/frontend-testing';

import { ResultSizeError, SearchClient } from '../search-client';

function awaitEvent(emitter, event) {
  return new Promise(resolve => {
    emitter.on(event, resolve);
  });
}

const RESULTS = [
  // nb. `created` and `updated` dates are in opposite order and different months
  // to make it easy to check in tests that correct field was used for searching/sorting.
  { id: 'one', created: '2020-01-01', updated: '2020-02-04' },
  { id: 'two', created: '2020-01-02', updated: '2020-02-03' },
  { id: 'three', created: '2020-01-03', updated: '2020-02-02' },
  { id: 'four', created: '2020-01-04', updated: '2020-02-01' },
  { id: 'five', created: '2020-01-05', updated: '2020-01-31' },
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

  it('fetches pages of results for a single URI', async () => {
    const client = new SearchClient(fakeSearchFn, { getPageSize: () => 3 });

    client.get({ uri: 'http://example.com' });
    await awaitEvent(client, 'end');

    const searchCalls = fakeSearchFn.getCalls();
    assert.equal(searchCalls.length, 2);
    assert.deepEqual(searchCalls[0].args[0], {
      _separate_replies: true,
      limit: 3,
      order: 'asc',
      sort: 'created',
      uri: 'http://example.com',
    });
    assert.deepEqual(searchCalls[1].args[0], {
      _separate_replies: true,
      limit: 3,
      order: 'asc',
      search_after: '2020-01-03',
      sort: 'created',
      uri: 'http://example.com',
    });
  });

  it('emits "results"', async () => {
    const client = new SearchClient(fakeSearchFn);
    const onResults = sinon.stub();
    client.on('results', onResults);

    client.get({ uri: 'http://example.com' });
    await awaitEvent(client, 'end');

    assert.calledWith(onResults, RESULTS);
  });

  it('emits "resultCount"', async () => {
    const client = new SearchClient(fakeSearchFn);
    const onResultCount = sinon.stub();
    client.on('resultCount', onResultCount);

    client.get({ uri: 'http://example.com' });
    await awaitEvent(client, 'end');

    assert.calledWith(onResultCount, RESULTS.length);
  });

  it('emits "end" only once', done => {
    const client = new SearchClient(fakeSearchFn, { getPageSize: () => 2 });
    client.on('results', sinon.stub());
    let emitEndCounter = 0;
    client.on('end', () => {
      emitEndCounter += 1;
      assert.equal(emitEndCounter, 1);
      done();
    });
    client.get({ uri: 'http://example.com' });
  });

  it('emits "results" with pages in incremental mode', async () => {
    const client = new SearchClient(fakeSearchFn, { getPageSize: () => 2 });
    const onResults = sinon.stub();
    client.on('results', onResults);

    client.get({ uri: 'http://example.com' });
    await awaitEvent(client, 'end');

    assert.calledWith(onResults, RESULTS.slice(0, 2));
    assert.calledWith(onResults, RESULTS.slice(2, 4));
  });

  it('emits "resultCount" only once in incremental mode', async () => {
    const client = new SearchClient(fakeSearchFn, { getPageSize: () => 2 });
    const onResultCount = sinon.stub();
    client.on('resultCount', onResultCount);

    client.get({ uri: 'http://example.com' });
    await awaitEvent(client, 'end');

    assert.calledWith(onResultCount, RESULTS.length);
    assert.calledOnce(onResultCount);
  });

  it('emits "results" once in non-incremental mode', async () => {
    const client = new SearchClient(fakeSearchFn, {
      getPageSize: () => 2,
      incremental: false,
    });
    const onResults = sinon.stub();
    client.on('results', onResults);

    client.get({ uri: 'http://example.com' });
    await awaitEvent(client, 'end');

    assert.calledOnce(onResults);
    assert.calledWith(onResults, RESULTS);
  });

  it('does not emit "results" if canceled', async () => {
    const client = new SearchClient(fakeSearchFn);
    const onResults = sinon.stub();
    const onEnd = sinon.stub();
    client.on('results', onResults);
    client.on('end', onEnd);

    client.get({ uri: 'http://example.com' });
    client.cancel();
    await delay(0);

    assert.notCalled(onResults);
    assert.called(onEnd);
  });

  it('emits "error" event if search fails', async () => {
    const err = new Error('search failed');
    fakeSearchFn = () => {
      return Promise.reject(err);
    };
    const client = new SearchClient(fakeSearchFn);
    const onError = sinon.stub();
    client.on('error', onError);

    client.get({ uri: 'http://example.com' });
    await awaitEvent(client, 'end');

    assert.calledWith(onError, err);
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
    it('emits error if results size exceeds `maxResults`', async () => {
      const client = new SearchClient(fakeSearchFn, { maxResults: 2 });
      const onError = sinon.stub();
      client.on('error', onError);

      client.get({ uri: 'http://example.com' });
      await awaitEvent(client, 'end');

      assert.calledOnce(onError);
      assert.instanceOf(onError.getCall(0).args[0], ResultSizeError);
    });

    it('does not emit an error if results size is <= `maxResults`', async () => {
      const client = new SearchClient(fakeSearchFn, { maxResults: 20 });
      const onError = sinon.stub();
      client.on('error', onError);

      client.get({ uri: 'http://example.com' });
      await awaitEvent(client, 'end');

      assert.notCalled(onError);
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

  [
    {
      sortBy: 'updated',
      sortOrder: 'desc',
      expectedSearchAfter: [undefined, '2020-02-03', '2020-02-01'],
    },
    {
      sortBy: 'updated',
      sortOrder: 'asc',
      expectedSearchAfter: [undefined, '2020-02-01', '2020-02-03'],
    },
    {
      sortBy: 'created',
      sortOrder: 'desc',
      expectedSearchAfter: [undefined, '2020-01-04', '2020-01-02'],
    },
  ].forEach(({ sortBy, sortOrder, expectedSearchAfter }) => {
    it('sets correct "search_after" query parameter depending on `sortBy` and `sortOrder`', async () => {
      const client = new SearchClient(fakeSearchFn, {
        getPageSize: () => 2,
        sortBy,
        sortOrder,
      });

      client.get({ uri: 'http://example.com' });
      await awaitEvent(client, 'end');

      const searchAfterParams = fakeSearchFn
        .getCalls()
        .map(call => call.args[0].search_after);
      assert.deepEqual(searchAfterParams, expectedSearchAfter);
    });
  });

  it('fetches pages in sizes specified by `pageSize` callback', async () => {
    const pageSizes = [1, 2, 10];
    const getPageSize = sinon.spy(index => pageSizes[index]);

    const client = new SearchClient(fakeSearchFn, {
      getPageSize,
    });

    client.get({ uri: 'http://example.com' });
    await awaitEvent(client, 'end');

    const limitParams = fakeSearchFn.getCalls().map(call => call.args[0].limit);
    assert.deepEqual(limitParams, pageSizes);
    const pageIndexes = getPageSize.getCalls().map(call => call.args[0]);
    assert.deepEqual(pageIndexes, [0, 1, 2]);
  });

  // See https://github.com/hypothesis/client/issues/5219. Once
  // https://github.com/hypothesis/h/issues/7841 is completed this test and the
  // next one will become obsolete.
  it('fetches remaining pages if a page contains fewer annotations than requested', async () => {
    // Wrap search function to return fewer results in a page than requested.
    const fetchPage = args => fakeSearchFn({ ...args, limit: 1 });
    const client = new SearchClient(fetchPage, {
      getPageSize: () => 2,
    });
    const onResults = sinon.stub();
    client.on('results', onResults);

    client.get({ uri: 'http://example.com' });
    await awaitEvent(client, 'end');

    for (let i = 0; i < RESULTS.length; i++) {
      assert.calledWith(onResults, RESULTS.slice(i, i + 1));
    }
  });

  it('continues fetching until result page is empty if expected result count is large', async () => {
    const fetchPage = sinon.spy(async args => {
      const result = await fakeSearchFn(args);
      result.total = 3000;
      return result;
    });
    const client = new SearchClient(fetchPage, {
      getPageSize: () => RESULTS.length,
    });

    client.get({ uri: 'http://example.com' });
    await awaitEvent(client, 'end');

    assert.calledTwice(fetchPage);
  });
});
