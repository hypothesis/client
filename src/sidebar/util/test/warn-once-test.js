'use strict';

const warnOnce = require('../warn-once');

describe('warnOnce', () => {
  beforeEach(() => {
    sinon.stub(console, 'warn');
    warnOnce.reset();
  });

  afterEach(() => {
    console.warn.restore();
  });

  it('outputs a warning only the first time a given string is passed', () => {
    warnOnce('something is fishy');
    assert.calledWith(console.warn, 'something is fishy');

    console.warn.reset();
    warnOnce('something is fishy');
    assert.notCalled(console.warn);

    warnOnce('something else is wrong');
    assert.calledWith(console.warn, 'something else is wrong');
  });
});
