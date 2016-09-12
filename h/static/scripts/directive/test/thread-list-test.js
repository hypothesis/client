'use strict';

var angular = require('angular');

var EventEmitter = require('tiny-emitter');
var inherits = require('inherits');
var immutable = require('seamless-immutable');

var events = require('../../events');
var threadList = require('../thread-list');
var util = require('./util');

var annotFixtures = immutable({
  annotation: {$$tag: 't1', id: '1', text: 'text'},
  reply: {
    $$tag: 't2',
    id: '2',
    references: ['1'],
    text: 'areply',
  },
  highlight: {$highlight: true, $$tag: 't3', id: '3'},
});

var threadFixtures = immutable({
  thread: {
    children: [{
      id: annotFixtures.annotation.id,
      annotation: annotFixtures.annotation,
      children: [{
        id: annotFixtures.reply.id,
        annotation: annotFixtures.reply,
        children: [],
        visible: true,
      }],
      visible: true,
    },{
      id: annotFixtures.highlight.id,
      annotation: annotFixtures.highlight,
    }],
  },
});

var fakeVirtualThread;

function FakeVirtualThreadList($scope, $window, rootThread) {

  fakeVirtualThread = this; // eslint-disable-line consistent-this

  var thread = rootThread;

  this.setRootThread = function (_thread) {
    thread = _thread;
  };
  this.notify = function () {
    this.emit('changed', {
      offscreenLowerHeight: 10,
      offscreenUpperHeight: 20,
      visibleThreads: thread.children,
    });
  };
  this.detach = sinon.stub();
  this.yOffsetOf = function () {
    return 42;
  };
}
inherits(FakeVirtualThreadList, EventEmitter);

describe('threadList', function () {
  function createThreadList(inputs) {
    var defaultInputs = {
      thread: threadFixtures.thread,
      onClearSelection: sinon.stub(),
      onForceVisible: sinon.stub(),
      onFocus: sinon.stub(),
      onSelect: sinon.stub(),
      onSetCollapsed: sinon.stub(),
    };

    var element = util.createDirective(document, 'threadList',
      Object.assign({}, defaultInputs, inputs));

    return element;
  }

  before(function () {
    angular.module('app', [])
      .directive('threadList', threadList);
  });

  beforeEach(function () {
    angular.mock.module('app', {
      VirtualThreadList: FakeVirtualThreadList,
    });
  });

  it('displays the children of the root thread', function () {
    var element = createThreadList();
    fakeVirtualThread.notify();
    element.scope.$digest();
    var children = element[0].querySelectorAll('annotation-thread');
    assert.equal(children.length, 2);
  });

  describe('when a new annotation is created', function () {
    var scrollSpy;
    beforeEach(function () {
      scrollSpy = sinon.stub(window, 'scroll');
    });

    afterEach(function () {
      scrollSpy.restore();
    });

    it('scrolls the annotation into view', function () {
      var element = createThreadList();
      var annot = annotFixtures.annotation;
      element.scope.$broadcast(events.BEFORE_ANNOTATION_CREATED, annot);
      assert.called(scrollSpy);
    });

    it('does not scroll the annotation into view if it is a reply', function () {
      var element = createThreadList();
      var reply = annotFixtures.reply;
      element.scope.$broadcast(events.BEFORE_ANNOTATION_CREATED, reply);
      assert.notCalled(scrollSpy);
    });

    it('does not scroll the annotation into view if it is a highlight', function () {
      var element = createThreadList();
      var highlight = annotFixtures.highlight;
      element.scope.$broadcast(events.BEFORE_ANNOTATION_CREATED, highlight);
      assert.notCalled(scrollSpy);
    });

    it('clears the selection', function () {
      var inputs = { onClearSelection: sinon.stub() };
      var element = createThreadList(inputs);
      element.scope.$broadcast(events.BEFORE_ANNOTATION_CREATED,
        annotFixtures.annotation);
      assert.called(inputs.onClearSelection);
    });
  });

  it('calls onFocus() when the user hovers an annotation', function () {
    var inputs = {
      onFocus: {
        args: ['annotation'],
        callback: sinon.stub(),
      },
    };
    var element = createThreadList(inputs);
    fakeVirtualThread.notify();
    element.scope.$digest();
    var annotation = element[0].querySelector('.thread-list__card');
    util.sendEvent(annotation, 'mouseover');
    assert.calledWithMatch(inputs.onFocus.callback,
      sinon.match(annotFixtures.annotation));
  });

  it('calls onSelect() when a user clicks an annotation', function () {
    var inputs = {
      onSelect: {
        args: ['annotation'],
        callback: sinon.stub(),
      },
    };
    var element = createThreadList(inputs);
    fakeVirtualThread.notify();
    element.scope.$digest();
    var annotation = element[0].querySelector('.thread-list__card');
    util.sendEvent(annotation, 'click');
    assert.calledWithMatch(inputs.onSelect.callback,
      sinon.match(annotFixtures.annotation));
  });
});
