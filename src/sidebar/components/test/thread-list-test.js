'use strict';

var angular = require('angular');

var EventEmitter = require('tiny-emitter');
var inherits = require('inherits');
var immutable = require('seamless-immutable');

var events = require('../../events');
var threadList = require('../thread-list');
var util = require('../../directive/test/util');

var annotFixtures = immutable({
  annotation: {$tag: 't1', id: '1', text: 'text'},
  reply: {
    $tag: 't2',
    id: '2',
    references: ['1'],
    text: 'areply',
  },
  highlight: {$highlight: true, $tag: 't3', id: '3'},
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
var fakeSettings = {};

function FakeVirtualThreadList($scope, $window, rootThread, options) {

  fakeVirtualThread = this; // eslint-disable-line consistent-this

  var thread = rootThread;

  this.options = options;
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
  var threadListContainers;

  function createThreadList(inputs) {
    var defaultInputs = {
      thread: threadFixtures.thread,
      onClearSelection: sinon.stub(),
      onForceVisible: sinon.stub(),
      onFocus: sinon.stub(),
      onSelect: sinon.stub(),
      onSetCollapsed: sinon.stub(),
    };

    // Create a scrollable container for the `<thread-list>` so that scrolling
    // can be tested.
    var parentEl = document.createElement('div');
    parentEl.classList.add('js-thread-list-scroll-root');
    parentEl.style.overflow = 'scroll';
    parentEl.style.height = '100px';

    // Add an element inside the scrollable container which is much taller than
    // the container, so that it actually becomes scrollable.
    var tallDiv = document.createElement('div');
    tallDiv.style.height = '1000px';
    parentEl.appendChild(tallDiv);

    document.body.appendChild(parentEl);

    // Create the `<thread-list>` instance
    var element = util.createDirective(
      document,
      'threadList',
      Object.assign({}, defaultInputs, inputs),
      {}, // initialScope
      '', // initialHtml
      { parentElement: parentEl }
    );

    element.parentEl = parentEl;

    threadListContainers.push(parentEl);

    return element;
  }

  before(function () {
    angular.module('app', ['pascalprecht.translate'], function($translateProvider){
      $translateProvider.translations('en', {
        'Feedback' : 'Feedback',
      });
      $translateProvider.preferredLanguage('en');

    })
      .component('threadList', threadList);
  });

  beforeEach(function () {
    angular.mock.module('app', {
      VirtualThreadList: FakeVirtualThreadList,
      settings: fakeSettings,
    });
    threadListContainers = [];
  });

  afterEach(function () {
    threadListContainers.forEach(function (el) {
      el.remove();
    });
  });

  it('shows the clean theme when settings contains the clean theme option', function () {
    angular.mock.module('app', {
      VirtualThreadList: FakeVirtualThreadList,
      settings: { theme: 'clean'},
    });
    var element = createThreadList();
    fakeVirtualThread.notify();
    element.scope.$digest();
    assert.equal(element[0].querySelectorAll('.thread-list__card--theme-clean').length, element[0].querySelectorAll('annotation-thread').length);
  });

  it('displays the children of the root thread', function () {
    var element = createThreadList();
    fakeVirtualThread.notify();
    element.scope.$digest();
    var children = element[0].querySelectorAll('annotation-thread');
    assert.equal(children.length, 2);
  });

  describe('when a new annotation is created', function () {
    it('scrolls the annotation into view', function () {
      var element = createThreadList();
      element.parentEl.scrollTop = 500;

      var annot = annotFixtures.annotation;
      element.scope.$broadcast(events.BEFORE_ANNOTATION_CREATED, annot);

      // Check that the thread list was scrolled up to make the new annotation
      // visible.
      assert.isBelow(element.parentEl.scrollTop, 100);
    });

    it('does not scroll the annotation into view if it is a reply', function () {
      var element = createThreadList();
      element.parentEl.scrollTop = 500;

      var reply = annotFixtures.reply;
      element.scope.$broadcast(events.BEFORE_ANNOTATION_CREATED, reply);

      // Check that the thread list was not scrolled
      assert.equal(element.parentEl.scrollTop, 500);
    });

    it('does not scroll the annotation into view if it is a highlight', function () {
      var element = createThreadList();
      element.parentEl.scrollTop = 500;

      var highlight = annotFixtures.highlight;
      element.scope.$broadcast(events.BEFORE_ANNOTATION_CREATED, highlight);

      // Check that the thread list was not scrolled
      assert.equal(element.parentEl.scrollTop, 500);
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

  it('uses the correct scroll root', function () {
    createThreadList();
    var scrollRoot = fakeVirtualThread.options.scrollRoot;
    assert.isTrue(scrollRoot.classList.contains('js-thread-list-scroll-root'));
  });
});
