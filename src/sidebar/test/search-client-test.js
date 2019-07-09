'use strict';

const SearchClient = require('../search-client');

function awaitEvent(emitter, event) {
  return new Promise(function(resolve) {
    emitter.on(event, resolve);
  });
}

describe('SearchClient', () => {
  const RESULTS = [
    { id: 'one' },
    { id: 'two' },
    { id: 'three' },
    { id: 'four' },
  ];

  let fakeSearchFn;

  beforeEach(() => {
    fakeSearchFn = sinon.spy(function(params) {
      return Promise.resolve({
        rows: RESULTS.slice(params.offset, params.offset + params.limit),
        total: RESULTS.length,
      });
    });
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

  it('stops fetching chunks if the results array is empty', () => {
    // Simulate a situation where the `total` count for the server is incorrect
    // and we appear to have reached the end of the result list even though
    // `total` implies that there should be more results available.
    //
    // In that case the client should stop trying to fetch additional pages.
    fakeSearchFn = sinon.spy(() => {
      return Promise.resolve({
        rows: [],
        total: 1000,
      });
    });
    const client = new SearchClient(fakeSearchFn, { chunkSize: 2 });
    const onResults = sinon.stub();
    client.on('results', onResults);

    client.get({ uri: 'http://example.com' });

    return awaitEvent(client, 'end').then(() => {
      assert.calledWith(onResults, []);
      assert.calledOnce(fakeSearchFn);
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
});
