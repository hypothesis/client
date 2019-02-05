'use strict';

const sidebarTrigger = require('../sidebar-trigger');

describe('sidebarTrigger', function() {
  let triggerEl1;
  let triggerEl2;

  beforeEach(function() {
    triggerEl1 = document.createElement('button');
    triggerEl1.setAttribute('data-hypothesis-trigger', '');
    document.body.appendChild(triggerEl1);

    triggerEl2 = document.createElement('button');
    triggerEl2.setAttribute('data-hypothesis-trigger', '');
    document.body.appendChild(triggerEl2);
  });

  it('calls the show callback which a trigger button is clicked', function() {
    const fakeShowFn = sinon.stub();
    sidebarTrigger(document, fakeShowFn);

    triggerEl1.dispatchEvent(new Event('click'));
    triggerEl2.dispatchEvent(new Event('click'));

    assert.calledTwice(fakeShowFn);
  });
});
