'use strict';

/* eslint-disable no-console */

const redux = require('redux');

const debugMiddleware = require('../debug-middleware');

function id(state) {
  return state;
}

describe('debug middleware', function() {
  let store;

  beforeEach(function() {
    sinon.stub(console, 'log');
    sinon.stub(console, 'group');
    sinon.stub(console, 'groupEnd');

    const enhancer = redux.applyMiddleware(debugMiddleware);
    store = redux.createStore(id, {}, enhancer);
  });

  afterEach(function() {
    console.log.restore();
    console.group.restore();
    console.groupEnd.restore();

    delete window.debug;
  });

  it('logs app state changes when "window.debug" is truthy', function() {
    window.debug = true;
    store.dispatch({ type: 'SOMETHING_HAPPENED' });
    assert.called(console.log);
  });

  it('logs nothing when "window.debug" is falsey', function() {
    store.dispatch({ type: 'SOMETHING_HAPPENED' });
    assert.notCalled(console.log);
  });
});
