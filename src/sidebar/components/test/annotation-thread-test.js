'use strict';

var angular = require('angular');

var annotationThread = require('../annotation-thread');
var moderationBanner = require('../moderation-banner');
var fixtures = require('../../test/annotation-fixtures');
var util = require('../../directive/test/util');

function PageObject(element) {
  this.annotations = function () {
    return Array.from(element[0].querySelectorAll('annotation'));
  };
  this.visibleReplies = function () {
    return Array.from(element[0].querySelectorAll(
      '.annotation-thread__content > ul > li:not(.ng-hide)'
    ));
  };
  this.replyList = function () {
    return element[0].querySelector('.annotation-thread__content > ul');
  };
  this.isHidden = function (element) {
    return element.classList.contains('ng-hide');
  };
}

describe('annotationThread', function () {
  before(function () {
    angular.module('app', [])
      .component('annotationThread', annotationThread)
      .component('moderationBanner', {
        bindings: moderationBanner.bindings,
      });
  });

  beforeEach(function () {
    angular.mock.module('app');
  });

  it('renders the tree structure of parent and child annotations', function () {
    var element = util.createDirective(document, 'annotationThread', {
      thread: {
        id: '1',
        annotation: {id: '1', text: 'text'},
        children: [{
          id: '2',
          annotation: {id: '2', text: 'areply'},
          children: [],
          visible: true,
        }],
        visible: true,
      },
    });
    var pageObject = new PageObject(element);
    assert.equal(pageObject.annotations().length, 2);
    assert.equal(pageObject.visibleReplies().length, 1);
  });

  it('does not render hidden threads', function () {
    var element = util.createDirective(document, 'annotationThread', {
      thread: {
        id: '1',
        annotation: {id: '1'},
        visible: false,
        children: [],
      },
    });
    var pageObject = new PageObject(element);
    assert.equal(pageObject.annotations().length, 1);
    assert.isTrue(pageObject.isHidden(pageObject.annotations()[0]));
  });

  it('shows replies if not collapsed', function () {
    var element = util.createDirective(document, 'annotationThread', {
      thread: {
        id: '1',
        annotation: {id: '1'},
        visible: true,
        children: [{
          id: '2',
          annotation: {id: '2'},
          children: [],
          visible: true,
        }],
        collapsed: false,
      },
    });
    var pageObject = new PageObject(element);
    assert.isFalse(pageObject.isHidden(pageObject.replyList()));
  });

  it('does not show replies if collapsed', function () {
    var element = util.createDirective(document, 'annotationThread', {
      thread: {
        id: '1',
        annotation: {id: '1'},
        visible: true,
        children: [{
          id: '2',
          annotation: {id: '2'},
          children: [],
          visible: true,
        }],
        collapsed: true,
      },
    });
    var pageObject = new PageObject(element);
    assert.isTrue(pageObject.isHidden(pageObject.replyList()));
  });

  it('only shows replies that match the search filter', function () {
    var element = util.createDirective(document, 'annotationThread', {
      thread: {
        id: '1',
        annotation: {id: '1'},
        visible: true,
        children: [{
          id: '2',
          annotation: {id: '2'},
          children: [],
          visible: false,
        },{
          id: '3',
          annotation: {id: '3'},
          children: [],
          visible: true,
        }],
        collapsed: false,
      },
    });
    var pageObject = new PageObject(element);
    assert.equal(pageObject.visibleReplies().length, 1);
  });

  describe('#toggleCollapsed', function () {
    it('toggles replies', function () {
      var onChangeCollapsed = sinon.stub();
      var element = util.createDirective(document, 'annotationThread', {
        thread: {
          id: '123',
          annotation: {id: '123'},
          children: [],
          collapsed: true,
        },
        onChangeCollapsed: {
          args: ['id', 'collapsed'],
          callback: onChangeCollapsed,
        },
      });
      element.ctrl.toggleCollapsed();
      assert.calledWith(onChangeCollapsed, '123', false);
    });
  });

  describe('#showThreadAndReplies', function () {
    it('reveals all parents and replies', function () {
      var onForceVisible = sinon.stub();
      var thread = {
        id: '123',
        annotation: {id: '123'},
        children: [{
          id: 'child-id',
          annotation: {id: 'child-id'},
          children: [],
        }],
        parent: {
          id: 'parent-id',
          annotation: {id: 'parent-id'},
        },
      };
      var element = util.createDirective(document, 'annotationThread', {
        thread: thread,
        onForceVisible: {
          args: ['thread'],
          callback: onForceVisible,
        },
      });
      element.ctrl.showThreadAndReplies();
      assert.calledWith(onForceVisible, thread.parent);
      assert.calledWith(onForceVisible, thread);
      assert.calledWith(onForceVisible, thread.children[0]);
    });
  });

  it('renders the moderation banner', function () {
    var ann = fixtures.moderatedAnnotation({ flagCount: 1 });
    var thread = {
      annotation: ann,
      id: '123',
      parent: null,
      children: [],
    };
    var element = util.createDirective(document, 'annotationThread', {
      thread: thread,
    });
    var moderationBanner = element
      .find('moderation-banner')
      .controller('moderationBanner');
    assert.deepEqual(moderationBanner, { annotation: ann });
  });

  it('does not render the annotation or moderation banner if there is no annotation', function () {
    var thread = {
      annotation: null,
      id: '123',
      parent: null,
      children: [],
    };
    var element = util.createDirective(document, 'annotationThread', {
      thread: thread,
    });
    assert.notOk(element[0].querySelector('moderation-banner'));
    assert.notOk(element[0].querySelector('annotation'));
  });
});
