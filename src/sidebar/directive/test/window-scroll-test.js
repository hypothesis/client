'use strict';

const angular = require('angular');

const inject = angular.mock.inject;

const windowScroll = require('../window-scroll');

describe('windowScroll', function() {
  let directive = null;

  let doc = null;
  let html = null;
  let view = null;

  let scope = null;
  let elem = null;
  let attr = null;

  beforeEach(inject(function($injector) {
    directive = $injector.invoke(windowScroll);

    html = {};
    view = {
      addEventListener: sinon.spy(),
      removeEventListener: sinon.spy(),
    };

    doc = { documentElement: html, defaultView: view };

    scope = { $apply: sinon.stub().yields(), $on: sinon.stub() };
    elem = {
      prop: sinon
        .stub()
        .withArgs('ownerDocument')
        .returns(doc),
    };
    attr = { windowScroll: sinon.stub() };

    directive.link(scope, elem, attr);
  }));

  it('installs a scroll handler on the window', function() {
    assert.calledOnce(view.addEventListener);
    assert.calledWith(view.addEventListener, 'scroll', sinon.match.func);

    assert.calledOnce(scope.$on);
    assert.calledWith(scope.$on, '$destroy', sinon.match.func);

    scope.$on.firstCall.args[1]();

    const handler = view.addEventListener.firstCall.args[1];
    assert.calledOnce(view.removeEventListener);
    assert.calledWith(view.removeEventListener, 'scroll', handler);
  });

  describe('attribute argument', function() {
    let callback = null;
    let handler = null;

    beforeEach(function() {
      callback = attr.windowScroll;
      handler = view.addEventListener.firstCall.args[1];
      html.clientHeight = 100;
      html.scrollHeight = 1000;
      view.scrollY = 0;
    });

    it('is not called when scrolling near the top of the view', function() {
      handler();
      assert.notCalled(callback);
    });

    it('is not called when scrolling near the middle of the view', function() {
      handler();
      view.scrollY = 500;

      handler();
      assert.notCalled(callback);
    });

    it('is called when one screen remains', function() {
      handler();

      view.scrollY = 800;
      handler();

      assert.calledOnce(callback);
    });

    describe('throttle', function() {
      it('prevents extraneous calls', function() {
        view.scrollY = 800;
        handler();
        handler();
        assert.calledOnce(callback);
      });

      it('allows calls after the view grows', function() {
        view.scrollY = 800;
        handler();
        assert.calledOnce(callback);

        html.scrollHeight = 2000;
        handler();
        assert.calledOnce(callback);

        view.scrollY = 1800;
        handler();
        assert.calledTwice(callback);
      });
    });
  });
});
