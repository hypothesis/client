'use strict';

var angular = require('angular');
var proxyquire = require('proxyquire');

var events = require('../../events');
var fixtures = require('../../test/annotation-fixtures');
var testUtil = require('../../../shared/test/util');
var util = require('../../directive/test/util');

var inject = angular.mock.inject;
var unroll = testUtil.unroll;

var draftFixtures = {
  shared: { text: 'draft', tags: [], isPrivate: false },
  private: { text: 'draft', tags: [], isPrivate: true },
};

var groupFixtures = {
  private: {
    id: 'private',
    url: 'https://example.org/g/private',
    public: false,
  },
  public: {
    id: 'world',
    url: 'https://example.org/g/public',
    public: true,
  },
};

/**
 * Returns the annotation directive with helpers stubbed out.
 */
function annotationComponent() {
  var noop = function () { return ''; };

  return proxyquire('../annotation', {
    angular: testUtil.noCallThru(angular),
    '../filter/persona': {
      username: noop,
    },
  });
}

/**
 * Returns the controller for the action button with the given `label`.
 *
 * @param {Element} annotationEl - Annotation element
 * @param {string} label - Button label
 */
function findActionButton(annotationEl, label) {
  var btns = Array.from(annotationEl[0].querySelectorAll('annotation-action-button'));
  var match = btns.find(function (btn) {
    var ctrl = angular.element(btn).controller('annotationActionButton');
    return ctrl.label === label;
  });
  return match ? angular.element(match).controller('annotationActionButton') : null;
}

describe('annotation', function() {
  describe('updateModel()', function() {
    var updateModel = require('../annotation').updateModel;

    function fakePermissions() {
      return {
        shared: function() {},
        private: function() {},
      };
    }

    it('copies tags and text into the new model', function() {
      var changes = {text: 'bar', tags: ['foo', 'bar']};
      var newModel = updateModel(fixtures.defaultAnnotation(), changes,
        fakePermissions());
      assert.deepEqual(newModel.tags, changes.tags);
      assert.equal(newModel.text, changes.text);
    });

    it('sets permissions to private if the draft is private', function() {
      var changes = {isPrivate: true, text: 'bar', tags: ['foo', 'bar']};
      var annot = fixtures.defaultAnnotation();
      var permissions = fakePermissions();
      permissions.private = sinon.stub().returns('private permissions');
      var newModel = updateModel(annot, changes, permissions);
      assert.equal(newModel.permissions, 'private permissions');
    });

    it('sets permissions to shared if the draft is shared', function() {
      var changes = {isPrivate: false, text: 'bar', tags: ['foo', 'bar']};
      var annot = fixtures.defaultAnnotation();
      var permissions = fakePermissions();
      permissions.shared = sinon.stub().returns('shared permissions');
      var newModel = updateModel(annot, changes, permissions);
      assert.equal(newModel.permissions, 'shared permissions');
    });
  });

  describe('AnnotationController', function() {
    var $q;
    var $rootScope;
    var $scope;
    var $timeout;
    var $window;
    var fakeAnalytics;
    var fakeAnnotationMapper;
    var fakeAnnotationUI;
    var fakeDrafts;
    var fakeFeatures;
    var fakeFlash;
    var fakeGroups;
    var fakePermissions;
    var fakeServiceUrl;
    var fakeSession;
    var fakeSettings;
    var fakeStore;
    var fakeStreamer;
    var sandbox;

    function createDirective(annotation) {
      annotation = annotation || fixtures.defaultAnnotation();
      var element = util.createDirective(document, 'annotation', {
        annotation: annotation,
      });

      // A new annotation won't have any saved drafts yet.
      if (!annotation.id) {
        fakeDrafts.get.returns(null);
      }

      return {
        annotation: annotation,
        controller: element.ctrl,
        element: element,
        scope: element.scope,
      };
    }

    before(function() {
      angular.module('h', [])
        .component('annotation', annotationComponent())
        .component('annotationActionButton', {
          bindings: require('../annotation-action-button').bindings,
        })
        .component('markdown', {
          bindings: require('../markdown').bindings,
        });
    });

    beforeEach(angular.mock.module('h'));
    beforeEach(angular.mock.module(function($provide) {
      sandbox = sinon.sandbox.create();

      fakeAnalytics = {
        track: sandbox.stub(),
        events: {},
      };

      fakeAnnotationMapper = {
        createAnnotation: sandbox.stub().returns({
          permissions: {
            read: ['acct:bill@localhost'],
            update: ['acct:bill@localhost'],
            destroy: ['acct:bill@localhost'],
            admin: ['acct:bill@localhost'],
          },
        }),
        deleteAnnotation: sandbox.stub(),
        flagAnnotation: sandbox.stub(),
      };

      fakeAnnotationUI = {
        updateFlagStatus: sandbox.stub().returns(true),
      };

      fakeDrafts = {
        update: sandbox.stub(),
        remove: sandbox.stub(),
        get: sandbox.stub().returns(null),
      };

      fakeFeatures = {
        flagEnabled: sandbox.stub().returns(true),
      };

      fakeFlash = {
        error: sandbox.stub(),
      };

      fakePermissions = {
        isShared: sandbox.stub().returns(true),
        permits: sandbox.stub().returns(true),
        shared: sandbox.stub().returns({
          read: ['everybody'],
        }),
        'private': sandbox.stub().returns({
          read: ['justme'],
        }),
        'default': sandbox.stub().returns({
          read: ['default'],
        }),
        setDefault: sandbox.stub(),
      };

      fakeSession = {
        state: {
          userid: 'acct:bill@localhost',
        },
      };

      fakeServiceUrl = sinon.stub();

      fakeGroups = {
        focused: sinon.stub().returns(groupFixtures.public),
        get: sinon.stub().returns(groupFixtures.public),
      };

      fakeSettings = {
        // "localhost" is the host used by 'first party' annotation fixtures
        authDomain: 'localhost',
      };

      fakeStore = {
        annotation: {
          create: sinon.spy(function (annot) {
            return Promise.resolve(Object.assign({}, annot));
          }),
          update: sinon.spy(function (annot) {
            return Promise.resolve(Object.assign({}, annot));
          }),
        },
      };

      fakeStreamer = {
        hasPendingDeletion: sinon.stub(),
      };

      $provide.value('analytics', fakeAnalytics);
      $provide.value('annotationMapper', fakeAnnotationMapper);
      $provide.value('annotationUI', fakeAnnotationUI);
      $provide.value('drafts', fakeDrafts);
      $provide.value('features', fakeFeatures);
      $provide.value('flash', fakeFlash);
      $provide.value('groups', fakeGroups);
      $provide.value('permissions', fakePermissions);
      $provide.value('session', fakeSession);
      $provide.value('serviceUrl', fakeServiceUrl);
      $provide.value('settings', fakeSettings);
      $provide.value('store', fakeStore);
      $provide.value('streamer', fakeStreamer);
    }));

    beforeEach(
      inject(
        function(_$q_, _$rootScope_, _$timeout_,
                _$window_) {
          $window = _$window_;
          $q = _$q_;
          $timeout = _$timeout_;
          $rootScope = _$rootScope_;
          $scope = $rootScope.$new();
        }
      )
    );

    afterEach(function() {
      sandbox.restore();
    });

    describe('initialization', function() {
      it('sets the user of annotations that don\'t have one', function() {
        // You can create annotations while logged out and then login.
        // When you login a new AnnotationController instance is created for
        // each of your annotations, and on initialization it will set the
        // annotation's user to your username from the session.
        var annotation = fixtures.newAnnotation();
        annotation.user = undefined;
        fakeSession.state.userid = 'acct:bill@localhost';

        createDirective(annotation);

        assert.equal(annotation.user, 'acct:bill@localhost');
      });

      it('sets the permissions of new annotations', function() {
        // You can create annotations while logged out and then login.
        // When you login a new AnnotationController instance is created for
        // each of your annotations, and on initialization it will set the
        // annotation's permissions using your username from the session.
        var annotation = fixtures.newAnnotation();
        annotation.user = annotation.permissions = undefined;
        annotation.group = '__world__';
        fakeSession.state.userid = 'acct:bill@localhost';
        fakePermissions.default = function (userid, group) {
          return {
            read: [userid, group],
          };
        };

        createDirective(annotation);

        assert.deepEqual(annotation.permissions, fakePermissions.default(
                         fakeSession.state.userid, annotation.group));
      });

      it('sets the tags and text fields for new annotations', function () {
        var annotation = fixtures.newAnnotation();
        delete annotation.tags;
        delete annotation.text;
        createDirective(annotation);
        assert.equal(annotation.text, '');
        assert.deepEqual(annotation.tags, []);
      });

      it('preserves the permissions of existing annotations', function() {
        var annotation = fixtures.newAnnotation();
        annotation.permissions = {
          permissions: {
            read: ['foo'],
            update: ['bar'],
            'delete': ['gar'],
            admin: ['har'],
          },
        };
        var originalPermissions = JSON.parse(JSON.stringify(
          annotation.permissions));
        fakePermissions.default = function () {
          return 'new permissions';
        };
        fakePermissions.isShared = function () {};
        createDirective(annotation);
        assert.deepEqual(annotation.permissions, originalPermissions);
      });

      it('saves new highlights to the server on initialization', function() {
        var annotation = fixtures.newHighlight();
        // The user is logged-in.
        annotation.user = fakeSession.state.userid = 'acct:bill@localhost';
        createDirective(annotation);

        assert.called(fakeStore.annotation.create);
      });

      it('saves new highlights to drafts if not logged in', function() {
        var annotation = fixtures.newHighlight();
        // The user is not logged-in.
        annotation.user = fakeSession.state.userid = undefined;

        createDirective(annotation);

        assert.notCalled(fakeStore.annotation.create);
        assert.called(fakeDrafts.update);
      });

      it('does not save new annotations on initialization', function() {
        var annotation = fixtures.newAnnotation();

        createDirective(annotation);

        assert.notCalled(fakeStore.annotation.create);
      });

      it('does not save old highlights on initialization', function() {
        var annotation = fixtures.oldHighlight();

        createDirective(annotation);

        assert.notCalled(fakeStore.annotation.create);
      });

      it('does not save old annotations on initialization', function() {
        var annotation = fixtures.oldAnnotation();

        createDirective(annotation);

        assert.notCalled(fakeStore.annotation.create);
      });

      it('creates drafts for new annotations on initialization', function() {
        var annotation = fixtures.newAnnotation();
        createDirective(annotation);
        assert.calledWith(fakeDrafts.update, annotation, {
          isPrivate: false,
          tags: annotation.tags,
          text: annotation.text,
        });
      });

      it('does not create drafts for new highlights on initialization', function() {
        var annotation = fixtures.newHighlight();
        var controller = createDirective(annotation).controller;

        assert.notOk(controller.editing());
        assert.notCalled(fakeDrafts.update);
      });

      it('edits annotations with drafts on initialization', function() {
        var annotation = fixtures.oldAnnotation();
        // The drafts service has some draft changes for this annotation.
        fakeDrafts.get.returns({text: 'foo', tags: []});

        var controller = createDirective(annotation).controller;

        assert.isTrue(controller.editing());
      });
    });

    describe('#editing()', function() {
      it('returns false if the annotation does not have a draft', function () {
        var controller = createDirective().controller;
        assert.notOk(controller.editing());
      });

      it('returns true if the annotation has a draft', function () {
        var controller = createDirective().controller;
        fakeDrafts.get.returns({tags: [], text: '', isPrivate: false});
        assert.isTrue(controller.editing());
      });

      it('returns false if the annotation has a draft but is being saved', function () {
        var controller = createDirective().controller;
        fakeDrafts.get.returns({tags: [], text: '', isPrivate: false});
        controller.isSaving = true;
        assert.isFalse(controller.editing());
      });
    });

    describe('#isHighlight()', function() {
      it('returns true for new highlights', function() {
        var annotation = fixtures.newHighlight();

        var vm = createDirective(annotation).controller;

        assert.isTrue(vm.isHighlight());
      });

      it('returns false for new annotations', function() {
        var annotation = fixtures.newAnnotation();

        var vm = createDirective(annotation).controller;

        assert.isFalse(vm.isHighlight());
      });

      it('returns false for page notes', function() {
        var annotation = fixtures.oldPageNote();

        var vm = createDirective(annotation).controller;

        assert.isFalse(vm.isHighlight());
      });

      it('returns false for replies', function() {
        var annotation = fixtures.oldReply();

        var vm = createDirective(annotation).controller;

        assert.isFalse(vm.isHighlight());
      });

      it('returns false for annotations with text but no tags', function() {
        var annotation = fixtures.oldAnnotation();
        annotation.text = 'This is my annotation';
        annotation.tags = [];

        var vm = createDirective(annotation).controller;

        assert.isFalse(vm.isHighlight());
      });

      it('returns false for annotations with tags but no text', function() {
        var annotation = fixtures.oldAnnotation();
        annotation.text = '';
        annotation.tags = ['foo'];

        var vm = createDirective(annotation).controller;

        assert.isFalse(vm.isHighlight());
      });

      it('returns true for annotations with no text or tags', function() {
        var annotation = fixtures.oldAnnotation();
        annotation.text = '';
        annotation.tags = [];

        var vm = createDirective(annotation).controller;

        assert.isTrue(vm.isHighlight());
      });

      it('returns false for censored annotations', function() {
        var ann = Object.assign(fixtures.oldAnnotation(), {
          hidden: true,
          text: '',
          tags: [],
        });

        var vm = createDirective(ann).controller;

        assert.isFalse(vm.isHighlight());
      });
    });

    describe('when the annotation is a highlight', function() {
      var annotation;

      beforeEach(function() {
        annotation = fixtures.defaultAnnotation();
        annotation.$highlight = true;
      });

      it('is private', function() {
        delete annotation.id;
        createDirective(annotation);
        $scope.$digest();
        assert.deepEqual(annotation.permissions, {
          read: ['justme'],
        });
      });
    });

    describe('#reply', function() {
      var annotation;

      beforeEach(function() {
        annotation = fixtures.defaultAnnotation();
        annotation.permissions = {
          read: ['acct:joe@localhost'],
          update: ['acct:joe@localhost'],
          destroy: ['acct:joe@localhost'],
          admin: ['acct:joe@localhost'],
        };
      });

      it('creates a new reply with the proper uri and references', function() {
        var controller = createDirective(annotation).controller;
        var reply = sinon.match({
          references: [annotation.id],
          target: [{
            source: annotation.target[0].source,
          }],
          uri: annotation.uri,
        });
        controller.reply();
        assert.calledWith(fakeAnnotationMapper.createAnnotation, reply);
      });

      it('makes the reply shared if the parent is shared', function() {
        var controller = createDirective(annotation).controller;
        var perms = {read: ['agroup']};
        var reply = sinon.match({
          references: [annotation.id],
          permissions: perms,
          uri: annotation.uri,
        });
        fakePermissions.isShared.returns(true);
        fakePermissions.shared.returns(perms);
        controller.reply();
        assert.calledWith(fakeAnnotationMapper.createAnnotation, reply);
      });

      it('makes the reply private if the parent is private', function() {
        var controller = createDirective(annotation).controller;
        fakePermissions.isShared.returns(false);
        var perms = {read: ['onlyme']};
        fakePermissions.private.returns(perms);
        var reply = sinon.match({permissions: perms});
        controller.reply();
        assert.calledWith(fakeAnnotationMapper.createAnnotation, reply);
      }
      );

      it('sets the reply\'s group to be the same as its parent\'s', function() {
        var annotation = fixtures.defaultAnnotation();
        annotation.group = 'my group';
        var controller = createDirective(annotation).controller;
        var reply = sinon.match({group: annotation.group});
        controller.reply();
        assert.calledWith(fakeAnnotationMapper.createAnnotation, reply);
      });
    });

    describe('#setPrivacy', function() {
      it('makes the annotation private when level is "private"', function() {
        var parts = createDirective();
        parts.controller.setPrivacy('private');
        assert.calledWith(fakeDrafts.update, parts.controller.annotation, sinon.match({
          isPrivate: true,
        }));
      });

      it('makes the annotation shared when level is "shared"', function() {
        var parts = createDirective();
        parts.controller.setPrivacy('shared');
        assert.calledWith(fakeDrafts.update, parts.controller.annotation, sinon.match({
          isPrivate: false,
        }));
      });

      it('sets the default visibility level if "shared"', function() {
        var parts = createDirective();
        parts.controller.edit();
        parts.controller.setPrivacy('shared');
        assert.calledWith(fakePermissions.setDefault, 'shared');
      });

      it('sets the default visibility if "private"', function() {
        var parts = createDirective();
        parts.controller.edit();
        parts.controller.setPrivacy('private');
        assert.calledWith(fakePermissions.setDefault, 'private');
      });

      it('doesn\'t save the visibility if the annotation is a reply', function() {
        var parts = createDirective(fixtures.oldReply());
        parts.controller.setPrivacy('private');
        assert.notCalled(fakePermissions.setDefault);
      });
    });

    describe('#hasContent', function() {
      it('returns false if the annotation has no tags or text', function() {
        var controller = createDirective(fixtures.oldHighlight()).controller;
        assert.ok(!controller.hasContent());
      });

      it('returns true if the annotation has tags or text', function() {
        var controller = createDirective(fixtures.oldAnnotation()).controller;
        assert.ok(controller.hasContent());
      });
    });

    describe('#quote', function() {
      it('returns `null` if the annotation has no quotes', function() {
        var annotation = fixtures.defaultAnnotation();
        annotation.target = [{}];
        var controller = createDirective(annotation).controller;

        assert.isNull(controller.quote());
      });

      it('returns `null` if the annotation has selectors but no quote selector', function () {
        var annotation = fixtures.defaultAnnotation();
        annotation.target = [{
          selector: [],
        }];
        var controller = createDirective(annotation).controller;

        assert.isNull(controller.quote());
      });

      it("returns the first quote's text if the annotation has quotes", function() {
        var annotation = fixtures.defaultAnnotation();
        annotation.target = [
          {
            selector: [
              {
                type: 'TextQuoteSelector',
                exact: 'The text that the user selected',
              },
            ],
          },
        ];
        var controller = createDirective(annotation).controller;

        assert.equal(controller.quote(), 'The text that the user selected');
      });
    });

    describe('#delete()', function() {
      beforeEach(function() {
        fakeAnnotationMapper.deleteAnnotation = sandbox.stub();
      });

      it(
        'calls annotationMapper.delete() if the delete is confirmed',
        function(done) {
          var parts = createDirective();
          sandbox.stub($window, 'confirm').returns(true);
          fakeAnnotationMapper.deleteAnnotation.returns($q.resolve());
          parts.controller.delete().then(function() {
            assert.calledWith(fakeAnnotationMapper.deleteAnnotation,
                parts.annotation);
            done();
          });
          $timeout.flush();
        }
      );

      it(
        'doesn\'t call annotationMapper.delete() if the delete is cancelled',
        function(done) {
          var parts = createDirective();
          sandbox.stub($window, 'confirm').returns(false);
          parts.controller.delete().then(function() {
            assert.notCalled(fakeAnnotationMapper.deleteAnnotation);
            done();
          });
          $timeout.flush();
        }
      );

      it('flashes an error if the delete fails on the server', function(done) {
        var controller = createDirective().controller;
        sandbox.stub($window, 'confirm').returns(true);
        var err = new Error('500 Server Error');
        fakeAnnotationMapper.deleteAnnotation.returns($q.reject(err));
        controller.delete().then(function() {
          assert.calledWith(fakeFlash.error,
            '500 Server Error', 'Deleting annotation failed');
          done();
        });
        $timeout.flush();
      });

      it('doesn\'t flash an error if the delete succeeds', function(done) {
        var controller = createDirective().controller;
        sandbox.stub($window, 'confirm').returns(true);
        fakeAnnotationMapper.deleteAnnotation.returns($q.resolve());
        controller.delete().then(function() {
          assert.notCalled(fakeFlash.error);
          done();
        });
        $timeout.flush();
      });
    });

    describe('#flag()', function() {
      beforeEach(function() {
        fakeAnnotationMapper.flagAnnotation = sandbox.stub();
      });

      context('when the user is not logged in', function() {
        beforeEach(function() {
          delete fakeSession.state.userid;
        });

        it('flashes an error', function() {
          createDirective().controller.flag();

          assert.isTrue(fakeFlash.error.calledOnce);
          assert.equal('Login to flag annotations', fakeFlash.error.args[0][1]);
        });

        it('doesn\'t try to flag the annotation', function() {
          createDirective().controller.flag();

          assert.isFalse(fakeAnnotationMapper.flagAnnotation.called);
        });
      });

      context('when the user is logged in', function() {
        it(
          'calls annotationMapper.flag() when an annotation is flagged',
          function(done) {
            var parts = createDirective();
            fakeAnnotationMapper.flagAnnotation.returns($q.resolve());
            parts.controller.flag();
            assert.calledWith(fakeAnnotationMapper.flagAnnotation,
                parts.annotation);
            done();
          }
        );

        it('flashes an error if the flag fails', function(done) {
          var controller = createDirective().controller;
          var err = new Error('500 Server error');
          fakeAnnotationMapper.flagAnnotation.returns(Promise.reject(err));
          controller.flag();
          setTimeout(function () {
            assert.calledWith(fakeFlash.error, '500 Server error', 'Flagging annotation failed');
            done();
          }, 0);
        });

        it('doesn\'t flash an error if the flag succeeds', function(done) {
          var controller = createDirective().controller;
          fakeAnnotationMapper.flagAnnotation.returns($q.resolve());
          controller.flag();
          setTimeout(function () {
            assert.notCalled(fakeFlash.error);
            done();
          }, 0);
        });
      });
    });

    describe('#isDeleted', function () {
      it('returns true if the annotation has been marked as deleted', function () {
        var controller = createDirective().controller;
        fakeStreamer.hasPendingDeletion.returns(true);
        assert.equal(controller.isDeleted(), true);
      });

      it('returns false if the annotation has not been marked as deleted', function () {
        var controller = createDirective().controller;
        fakeStreamer.hasPendingDeletion.returns(false);
        assert.equal(controller.isDeleted(), false);
      });
    });

    describe('#isOrphan', function () {
      it('returns false if the annotation is not an orphan', function () {
        var controller = createDirective().controller;
        controller.annotation.$orphan = false;
        assert.isFalse(controller.isOrphan());
      });

      it('returns true if the annotation is an orphan', function () {
        var controller = createDirective().controller;
        controller.annotation.$orphan = true;
        assert.isTrue(controller.isOrphan());
      });

      it('returns true if the anchoring timeout expired', function () {
        var controller = createDirective().controller;
        controller.annotation.$anchorTimeout = true;
        assert.isTrue(controller.isOrphan());
      });

      it('returns false if the anchoring timeout expired but anchoring did complete', function () {
        var controller = createDirective().controller;
        controller.annotation.$orphan = false;
        controller.annotation.$anchorTimeout = true;
        assert.isFalse(controller.isOrphan());
      });
    });

    describe('#canFlag', function () {
      it('returns true if the user is a third-party user', function () {
        var ann = fixtures.thirdPartyAnnotation();
        var controller = createDirective(ann).controller;
        assert.isTrue(controller.canFlag());
      });

      it('returns the value of the `flag_action` feature flag', function () {
        var ann = fixtures.defaultAnnotation();
        var controller = createDirective(ann).controller;

        ann.user = 'acct:notCurrentUser@localhost';

        fakeFeatures.flagEnabled.returns(false);
        assert.equal(controller.canFlag(), false);

        fakeFeatures.flagEnabled.returns(true);
        assert.equal(controller.canFlag(), true);
      });

      it('returns false if the user signed in is the same as the author of the annotation', function () {
        var ann = fixtures.defaultAnnotation();
        var controller = createDirective(ann).controller;

        fakeFeatures.flagEnabled.returns(true);

        assert.isFalse(controller.canFlag());
      });

      it('returns true if the user signed in is different from the author of the annotation', function () {
        var ann = fixtures.thirdPartyAnnotation();
        var controller = createDirective(ann).controller;

        fakeFeatures.flagEnabled.returns(true);

        assert.isTrue(controller.canFlag());
      });
    });

    describe('#shouldShowLicense', function () {
      unroll('returns #expected if #case_', function (testCase) {
        var ann = fixtures.publicAnnotation();
        ann.group = testCase.group.id;
        fakeDrafts.get.returns(testCase.draft);
        fakeGroups.get.returns(testCase.group);

        var controller = createDirective(ann).controller;

        assert.equal(controller.shouldShowLicense(), testCase.expected);
      }, [{
        case_: 'the annotation is not being edited',
        draft: null,
        group: groupFixtures.public,
        expected: false,
      },{
        case_: 'the draft is private',
        draft: draftFixtures.private,
        group: groupFixtures.public,
        expected: false,
      },{
        case_: 'the group is private',
        draft: draftFixtures.shared,
        group: groupFixtures.private,
        expected: false,
      },{
        case_: 'the draft is shared and the group is public',
        draft: draftFixtures.shared,
        group: groupFixtures.public,
        expected: true,
      }]);
    });

    describe('#authorize', function () {
      it('passes the current permissions and logged-in user ID to the permissions service', function () {
        var ann = fixtures.defaultAnnotation();
        ann.permissions = {
          read: [fakeSession.state.userid],
          delete: [fakeSession.state.userid],
          update: [fakeSession.state.userid],
        };
        var controller = createDirective(ann).controller;

        ['update', 'delete'].forEach(function (action) {
          controller.authorize(action);
          assert.calledWith(fakePermissions.permits, ann.permissions, action,
                            fakeSession.state.userid);
        });
      });
    });

    describe('saving a new annotation', function() {
      var annotation;

      beforeEach(function() {
        annotation = fixtures.newAnnotation();
      });

      function createController() {
        return createDirective(annotation).controller;
      }

      it('removes the draft when saving an annotation succeeds', function () {
        var controller = createController();
        return controller.save().then(function () {
          assert.calledWith(fakeDrafts.remove, annotation);
        });
      });

      it('emits annotationCreated when saving an annotation succeeds', function () {
        var controller = createController();
        sandbox.spy($rootScope, '$broadcast');
        return controller.save().then(function() {
          assert.calledWith($rootScope.$broadcast, events.ANNOTATION_CREATED);
        });
      });

      it('flashes an error if saving the annotation fails on the server', function() {
        var controller = createController();
        var err = new Error('500 Server Error');
        fakeStore.annotation.create = sinon.stub().returns(Promise.reject(err));
        return controller.save().then(function() {
          assert.calledWith(fakeFlash.error,
            '500 Server Error', 'Saving annotation failed');
        });
      });

      it('doesn\'t flash an error when saving an annotation succeeds', function() {
        var controller = createController();
        return controller.save().then(function () {
          assert.notCalled(fakeFlash.error);
        });
      });

      it('shows a saving indicator when saving an annotation', function() {
        var controller = createController();
        var create;
        fakeStore.annotation.create = sinon.stub().returns(new Promise(function (resolve) {
          create = resolve;
        }));
        var saved = controller.save();
        assert.equal(controller.isSaving, true);
        create(Object.assign({}, controller.annotation, {id: 'new-id'}));
        return saved.then(function () {
          assert.equal(controller.isSaving, false);
        });
      });

      it('does not remove the draft if saving fails', function () {
        var controller = createController();
        fakeStore.annotation.create = sinon.stub().returns(Promise.reject({status: -1}));
        return controller.save().then(function () {
          assert.notCalled(fakeDrafts.remove);
        });
      });

      it('sets the annotation\'s group to the focused group', function() {
        fakeGroups.focused = function () {
          return { id: 'test-id' };
        };
        var controller = createDirective(fixtures.newAnnotation()).controller;
        assert.equal(controller.annotation.group, 'test-id');
      });
    });

    describe('saving an edited an annotation', function() {
      var annotation;

      beforeEach(function() {
        annotation = fixtures.defaultAnnotation();
        fakeDrafts.get.returns({text: 'unsaved change'});
      });

      function createController() {
        return createDirective(annotation).controller;
      }

      it('flashes an error if saving the annotation fails on the server', function () {
        var controller = createController();
        var err = new Error('500 Server Error');
        fakeStore.annotation.update = sinon.stub().returns(Promise.reject(err));
        return controller.save().then(function() {
          assert.calledWith(fakeFlash.error,
            '500 Server Error', 'Saving annotation failed');
        });
      });

      it('doesn\'t flash an error if saving the annotation succeeds', function () {
        var controller = createController();
        return controller.save().then(function () {
          assert.notCalled(fakeFlash.error);
        });
      });
    });

    describe('drafts', function() {
      it('starts editing immediately if there is a draft', function() {
        fakeDrafts.get.returns({
          tags: ['unsaved'],
          text: 'unsaved-text',
        });
        var controller = createDirective().controller;
        assert.isTrue(controller.editing());
      });

      it('uses the text and tags from the draft if present', function() {
        fakeDrafts.get.returns({
          tags: ['unsaved-tag'],
          text: 'unsaved-text',
        });
        var controller = createDirective().controller;
        assert.deepEqual(controller.state().tags, ['unsaved-tag']);
        assert.equal(controller.state().text, 'unsaved-text');
      });

      it('removes the draft when changes are discarded', function() {
        var parts = createDirective();
        parts.controller.edit();
        parts.controller.revert();
        assert.calledWith(fakeDrafts.remove, parts.annotation);
      });

      it('removes the draft when changes are saved', function() {
        var annotation = fixtures.defaultAnnotation();
        var controller = createDirective(annotation).controller;
        fakeDrafts.get.returns({text: 'unsaved changes'});
        return controller.save().then(function() {
          assert.calledWith(fakeDrafts.remove, annotation);
        });
      });
    });

    describe('reverting edits', function () {
      it('removes the current draft', function() {
        var controller = createDirective(fixtures.defaultAnnotation()).controller;
        controller.edit();
        controller.revert();
        assert.calledWith(fakeDrafts.remove, controller.annotation);
      });

      it('deletes the annotation if it was new', function () {
        var controller = createDirective(fixtures.newAnnotation()).controller;
        sandbox.spy($rootScope, '$broadcast');
        controller.revert();
        assert.calledWith($rootScope.$broadcast, events.ANNOTATION_DELETED);
      });
    });

    describe('tag display', function () {
      it('displays links to tags on the stream', function () {
        fakeServiceUrl
          .withArgs('search.tag', {tag: 'atag'})
          .returns('https://test.hypothes.is/stream?q=tag:atag');

        var directive = createDirective(Object.assign(fixtures.defaultAnnotation(), {
          tags: ['atag'],
        }));
        var links = [].slice.apply(directive.element[0].querySelectorAll('a'));
        var tagLinks = links.filter(function (link) {
          return link.textContent === 'atag';
        });

        assert.equal(tagLinks.length, 1);
        assert.equal(tagLinks[0].href,
                     'https://test.hypothes.is/stream?q=tag:atag');
      });
    });

    describe('annotation links', function () {
      it('uses the in-context links when available', function () {
        var annotation = Object.assign({}, fixtures.defaultAnnotation(), {
          links: {
            incontext: 'https://hpt.is/deadbeef',
          },
        });
        var controller = createDirective(annotation).controller;
        assert.equal(controller.incontextLink(), annotation.links.incontext);
      });

      it('falls back to the HTML link when in-context links are missing', function () {
        var annotation = Object.assign({}, fixtures.defaultAnnotation(), {
          links: {
            html: 'https://test.hypothes.is/a/deadbeef',
          },
        });
        var controller = createDirective(annotation).controller;
        assert.equal(controller.incontextLink(), annotation.links.html);
      });

      it('in-context link is blank when unknown', function () {
        var annotation = fixtures.defaultAnnotation();
        var controller = createDirective(annotation).controller;
        assert.equal(controller.incontextLink(), '');
      });
    });

    it('renders quotes as plain text', function () {
      var ann = fixtures.defaultAnnotation();
      ann.target[0].selector = [{
        type: 'TextQuoteSelector',
        exact: '<<-&->>',
      }];
      var el = createDirective(ann).element;
      assert.equal(el[0].querySelector('blockquote').textContent, '<<-&->>');
    });

    unroll('renders hidden annotations with a custom text class (#context)', function (testCase) {
      var el = createDirective(testCase.ann).element;
      assert.match(el.find('markdown').controller('markdown'), sinon.match({
        customTextClass: testCase.textClass,
      }));
    }, [{
      context: 'for moderators',
      ann: Object.assign(fixtures.moderatedAnnotation({ hidden: true }), {
        // Content still present.
        text: 'Some offensive content',
      }),
      textClass: {
        'annotation-body is-hidden': true,
        'has-content': true,
      },
    },{
      context: 'for non-moderators',
      ann: Object.assign(fixtures.moderatedAnnotation({ hidden: true }), {
        // Content filtered out by service.
        tags: [],
        text: '',
      }),
      textClass: {
        'annotation-body is-hidden': true,
        'has-content': false,
      },
    }]);

    it('flags the annotation when the user clicks the "Flag" button', function () {
      fakeAnnotationMapper.flagAnnotation.returns(Promise.resolve());
      var ann = Object.assign(fixtures.defaultAnnotation(), { user: 'acct:notCurrentUser@localhost' });
      var el = createDirective(ann).element;
      var flagBtn = findActionButton(el, 'Report this annotation to the moderators');
      flagBtn.onClick();
      assert.called(fakeAnnotationMapper.flagAnnotation);
    });

    it('highlights the "Flag" button if the annotation is flagged', function () {
      var ann = Object.assign(fixtures.defaultAnnotation(), { flagged: true, user: 'acct:notCurrentUser@localhost' });
      var el = createDirective(ann).element;
      var flaggedBtn = findActionButton(el, 'Annotation has been reported to the moderators');
      assert.ok(flaggedBtn);
    });
  });
});
