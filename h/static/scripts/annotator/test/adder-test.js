'use strict';

var adder = require('../adder');
var unroll = require('../../test/util').unroll;

function rect(left, top, width, height) {
  return {left: left, top: top, width: width, height: height};
}

describe('adder', function () {
  var adderCtrl;
  var adderCallbacks;

  beforeEach(function () {
    adderCallbacks = {
      onAnnotate: sinon.stub(),
      onHighlight: sinon.stub(),
    };
    var adderEl = document.createElement('div');
    document.body.appendChild(adderEl);

    adderCtrl = new adder.Adder(adderEl, adderCallbacks);
  });

  afterEach(function () {
    adderCtrl.hide();
    adderCtrl.element.parentNode.removeChild(adderCtrl.element);
  });

  function windowSize() {
    var window = adderCtrl.element.ownerDocument.defaultView;
    return {width: window.innerWidth, height: window.innerHeight};
  }

  function adderSize() {
    var rect = adderCtrl.element.getBoundingClientRect();
    return {width: rect.width, height: rect.height};
  }

  context('when Shadow DOM is supported', function () {
    unroll('creates the adder DOM in a shadow root', function (testCase) {
      var adderEl = document.createElement('div');
      var shadowEl;
      adderEl[testCase.attachFn] = sinon.spy(function () {
        shadowEl = document.createElement('shadow-root');
        adderEl.appendChild(shadowEl);
        return shadowEl;
      });
      document.body.appendChild(adderEl);

      new adder.Adder(adderEl, adderCallbacks);

      assert.called(adderEl[testCase.attachFn]);
      assert.equal(shadowEl.childNodes[0].tagName.toLowerCase(), 'hypothesis-adder-toolbar');

      adderEl.remove();
    },[{
      attachFn: 'createShadowRoot', // Shadow DOM v0 API
    },{
      attachFn: 'attachShadow', // Shadow DOM v1 API
    }]);
  });

  describe('button handling', function () {
    it('calls onHighlight callback when Highlight button is clicked', function () {
      var highlightBtn = adderCtrl.element.querySelector('.js-highlight-btn');
      highlightBtn.dispatchEvent(new Event('click'));
      assert.called(adderCallbacks.onHighlight);
    });

    it('calls onAnnotate callback when Annotate button is clicked', function () {
      var annotateBtn = adderCtrl.element.querySelector('.js-annotate-btn');
      annotateBtn.dispatchEvent(new Event('click'));
      assert.called(adderCallbacks.onAnnotate);
    });
  });

  describe('#target', function () {
    it('positions the adder below the selection if the selection is forwards', function () {
      var target = adderCtrl.target(rect(100,200,100,20), false);
      assert.isAbove(target.top, 220);
      assert.equal(target.arrowDirection, adder.ARROW_POINTING_UP);
    });

    it('positions the adder above the selection if the selection is backwards', function () {
      var target = adderCtrl.target(rect(100,200,100,20), true);
      assert.isBelow(target.top, 200);
      assert.equal(target.arrowDirection, adder.ARROW_POINTING_DOWN);
    });

    it('does not position the adder above the top of the viewport', function () {
      var target = adderCtrl.target(rect(100,-100,100,20), false);
      assert.isAtLeast(target.top, 0);
      assert.equal(target.arrowDirection, adder.ARROW_POINTING_UP);
    });

    it('does not position the adder below the bottom of the viewport', function () {
      var viewSize = windowSize();
      var target = adderCtrl.target(rect(0,viewSize.height + 100,10,20), false);
      assert.isAtMost(target.top, viewSize.height - adderSize().height);
    });

    it('does not position the adder beyond the right edge of the viewport', function () {
      var viewSize = windowSize();
      var target = adderCtrl.target(rect(viewSize.width + 100,100,10,20), false);
      assert.isAtMost(target.left, viewSize.width);
    });

    it('does not positon the adder beyond the left edge of the viewport', function () {
      var target = adderCtrl.target(rect(-100,100,10,10), false);
      assert.isAtLeast(target.left, 0);
    });
  });
});
