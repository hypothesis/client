'use strict';

var annotationCounts = require('../annotation-counts');

describe('annotationCounts', function () {
  var countEl1;
  var countEl2;
  var CrossFrame;
  var fakeCrossFrame;
  var sandbox;

  beforeEach(function () {
    CrossFrame = null;
    fakeCrossFrame = {};
    sandbox = sinon.sandbox.create();

    countEl1 = document.createElement('button');
    countEl1.setAttribute('data-hypothesis-annotation-count', '');
    document.body.appendChild(countEl1);

    countEl2 = document.createElement('button');
    countEl2.setAttribute('data-hypothesis-annotation-count', '');
    document.body.appendChild(countEl2);

    fakeCrossFrame.on = sandbox.stub().returns(fakeCrossFrame);

    CrossFrame = sandbox.stub();
    CrossFrame.returns(fakeCrossFrame);
  });

  afterEach(function () {
    sandbox.restore();
    countEl1.remove();
    countEl2.remove();
  });

  describe('listen for "publicAnnotationCountChanged" event', function () {
    var emitEvent = function () {
      var crossFrameArgs;
      var evt;
      var fn;

      var event = arguments[0];
      var args = 2 <= arguments.length ? Array.prototype.slice.call(arguments, 1) : [];

      crossFrameArgs = fakeCrossFrame.on.args;
      for (var i = 0, len = crossFrameArgs.length; i < len; i++) {
        evt = crossFrameArgs[i][0];
        fn = crossFrameArgs[i][1];

        if (event === evt) {
          fn.apply(null, args);
        }
      }
    };

    it('displays the updated annotation count on the appropriate elements', function () {
      var newCount = 10;
      annotationCounts(document.body, fakeCrossFrame);

      emitEvent('publicAnnotationCountChanged', newCount);

      assert.equal(countEl1.textContent, newCount);
      assert.equal(countEl2.textContent, newCount);
    });
  });
});
