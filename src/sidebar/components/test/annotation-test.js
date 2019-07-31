'use strict';

const angular = require('angular');

const events = require('../../events');
const fixtures = require('../../test/annotation-fixtures');
const testUtil = require('../../../shared/test/util');
const util = require('../../directive/test/util');

const annotationComponent = require('../annotation');

const inject = angular.mock.inject;
const unroll = testUtil.unroll;

const draftFixtures = {
  shared: { text: 'draft', tags: [], isPrivate: false },
  private: { text: 'draft', tags: [], isPrivate: true },
};

const groupFixtures = {
  private: {
    id: 'private',
    url: 'https://example.org/g/private',
    type: 'private',
  },
  open: {
    id: 'world',
    url: 'https://example.org/g/open',
    type: 'open',
  },
  restricted: {
    id: 'restricto',
    url: 'https://example.org/g/restricto',
    type: 'restricted',
  },
};

/**
 * Returns the controller for the action button with the given `label`.
 *
 * @param {Element} annotationEl - Annotation element
 * @param {string} label - Button label
 */
function findActionButton(annotationEl, label) {
  const btns = Array.from(
    annotationEl[0].querySelectorAll('annotation-action-button')
  );
  const match = btns.find(function(btn) {
    const ctrl = angular.element(btn).controller('annotationActionButton');
    return ctrl.label === label;
  });
  return match
    ? angular.element(match).controller('annotationActionButton')
    : null;
}

describe('annotation', function() {
  describe('updateModel()', function() {
    const updateModel = require('../annotation').updateModel;

    function fakePermissions() {
      return {
        shared: function() {},
        private: function() {},
      };
    }

    it('copies tags and text into the new model', function() {
      const changes = { text: 'bar', tags: ['foo', 'bar'] };
      const newModel = updateModel(
        fixtures.defaultAnnotation(),
        changes,
        fakePermissions()
      );
      assert.deepEqual(newModel.tags, changes.tags);
      assert.equal(newModel.text, changes.text);
    });

    it('sets permissions to private if the draft is private', function() {
      const changes = { isPrivate: true, text: 'bar', tags: ['foo', 'bar'] };
      const annot = fixtures.defaultAnnotation();
      const permissions = fakePermissions();
      permissions.private = sinon.stub().returns('private permissions');
      const newModel = updateModel(annot, changes, permissions);
      assert.equal(newModel.permissions, 'private permissions');
    });

    it('sets permissions to shared if the draft is shared', function() {
      const changes = { isPrivate: false, text: 'bar', tags: ['foo', 'bar'] };
      const annot = fixtures.defaultAnnotation();
      const permissions = fakePermissions();
      permissions.shared = sinon.stub().returns('shared permissions');
      const newModel = updateModel(annot, changes, permissions);
      assert.equal(newModel.permissions, 'shared permissions');
    });
  });

  describe('AnnotationController', function() {
    let $q;
    let $rootScope;
    let $scope;
    let $timeout;
    let $window;
    const fakeAccountID = {
      isThirdPartyUser: sinon.stub(),
    };
    let fakeAnalytics;
    let fakeAnnotationMapper;
    let fakeStore;
    let fakeFlash;
    let fakeGroups;
    let fakePermissions;
    let fakeServiceUrl;
    let fakeSession;
    let fakeSettings;
    let fakeApi;
    let fakeBridge;
    let sandbox;

    beforeEach(() => {
      annotationComponent.$imports.$mock({
        '../util/account-id': fakeAccountID,
      });
    });

    afterEach(() => {
      annotationComponent.$imports.$restore();
    });

    function createDirective(annotation) {
      annotation = annotation || fixtures.defaultAnnotation();
      const element = util.createDirective(document, 'annotation', {
        annotation: annotation,
      });

      // A new annotation won't have any saved drafts yet.
      if (!annotation.id) {
        fakeStore.getDraft.returns(null);
      }

      return {
        annotation: annotation,
        controller: element.ctrl,
        element: element,
        scope: element.scope,
      };
    }

    before(function() {
      angular
        .module('h', [])
        .component('annotation', annotationComponent)
        .component('annotationActionButton', {
          bindings: {
            icon: '<',
            isDisabled: '<',
            label: '<',
            onClick: '&',
          },
        })
        .component('markdown', {
          bindings: require('../markdown').bindings,
        });
    });

    beforeEach(angular.mock.module('h'));
    beforeEach(
      angular.mock.module(function($provide) {
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

        fakeStore = {
          hasPendingDeletion: sinon.stub(),
          updateFlagStatus: sandbox.stub().returns(true),
          // draft store
          countDrafts: sandbox.stub().returns(0),
          createDraft: sandbox.stub(),
          discardAllDrafts: sandbox.stub(),
          getDraft: sandbox.stub().returns(null),
          getDraftIfNotEmpty: sandbox.stub().returns(null),
          removeDraft: sandbox.stub(),
        };

        fakeFlash = {
          error: sandbox.stub(),
        };

        fakeAccountID.isThirdPartyUser.reset();
        fakeAccountID.isThirdPartyUser.returns(false);

        fakePermissions = {
          isShared: sandbox.stub().returns(true),
          permits: sandbox.stub().returns(true),
          shared: sandbox.stub().returns({
            read: ['everybody'],
          }),
          private: sandbox.stub().returns({
            read: ['justme'],
          }),
          default: sandbox.stub().returns({
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
          focused: sinon.stub().returns(groupFixtures.open),
          get: sinon.stub().returns(groupFixtures.open),
        };

        fakeSettings = {
          // "localhost" is the host used by 'first party' annotation fixtures
          authDomain: 'localhost',
        };

        fakeApi = {
          annotation: {
            create: sinon.spy(function(annot) {
              return Promise.resolve(Object.assign({}, annot));
            }),
            update: sinon.spy(function(annot) {
              return Promise.resolve(Object.assign({}, annot));
            }),
          },
        };

        fakeBridge = {
          call: sinon.stub(),
        };

        $provide.value('analytics', fakeAnalytics);
        $provide.value('annotationMapper', fakeAnnotationMapper);
        $provide.value('store', fakeStore);
        $provide.value('api', fakeApi);
        $provide.value('bridge', fakeBridge);
        $provide.value('flash', fakeFlash);
        $provide.value('groups', fakeGroups);
        $provide.value('permissions', fakePermissions);
        $provide.value('session', fakeSession);
        $provide.value('serviceUrl', fakeServiceUrl);
        $provide.value('settings', fakeSettings);
      })
    );

    beforeEach(inject(function(_$q_, _$rootScope_, _$timeout_, _$window_) {
      $window = _$window_;
      $q = _$q_;
      $timeout = _$timeout_;
      $rootScope = _$rootScope_;
      $scope = $rootScope.$new();
    }));

    afterEach(function() {
      sandbox.restore();
    });

    describe('initialization', function() {
      it("sets the user of annotations that don't have one", function() {
        // You can create annotations while logged out and then login.
        // When you login a new AnnotationController instance is created for
        // each of your annotations, and on initialization it will set the
        // annotation's user to your username from the session.
        const annotation = fixtures.newAnnotation();
        annotation.user = undefined;
        fakeSession.state.userid = 'acct:bill@localhost';
        fakeSession.state.user_info = {
          display_name: 'Bill Jones',
        };

        createDirective(annotation);

        assert.equal(annotation.user, 'acct:bill@localhost');
        assert.deepEqual(annotation.user_info, {
          display_name: 'Bill Jones',
        });
      });

      it('sets the permissions of new annotations', function() {
        // You can create annotations while logged out and then login.
        // When you login a new AnnotationController instance is created for
        // each of your annotations, and on initialization it will set the
        // annotation's permissions using your username from the session.
        const annotation = fixtures.newAnnotation();
        annotation.user = annotation.permissions = undefined;
        annotation.group = '__world__';
        fakeSession.state.userid = 'acct:bill@localhost';
        fakePermissions.default = function(userid, group) {
          return {
            read: [userid, group],
          };
        };

        createDirective(annotation);

        assert.deepEqual(
          annotation.permissions,
          fakePermissions.default(fakeSession.state.userid, annotation.group)
        );
      });

      it('sets the tags and text fields for new annotations', function() {
        const annotation = fixtures.newAnnotation();
        delete annotation.tags;
        delete annotation.text;
        createDirective(annotation);
        assert.equal(annotation.text, '');
        assert.deepEqual(annotation.tags, []);
      });

      it('preserves the permissions of existing annotations', function() {
        const annotation = fixtures.newAnnotation();
        annotation.permissions = {
          permissions: {
            read: ['foo'],
            update: ['bar'],
            delete: ['gar'],
            admin: ['har'],
          },
        };
        const originalPermissions = JSON.parse(
          JSON.stringify(annotation.permissions)
        );
        fakePermissions.default = function() {
          return 'new permissions';
        };
        fakePermissions.isShared = function() {};
        createDirective(annotation);
        assert.deepEqual(annotation.permissions, originalPermissions);
      });

      it('saves new highlights to the server on initialization', function() {
        const annotation = fixtures.newHighlight();
        // The user is logged-in.
        annotation.user = fakeSession.state.userid = 'acct:bill@localhost';
        createDirective(annotation);

        assert.called(fakeApi.annotation.create);
      });

      it('saves new highlights to drafts if not logged in', function() {
        const annotation = fixtures.newHighlight();
        // The user is not logged-in.
        annotation.user = fakeSession.state.userid = undefined;

        createDirective(annotation);

        assert.notCalled(fakeApi.annotation.create);
        assert.called(fakeStore.createDraft);
      });

      it('opens the sidebar when trying to save highlights while logged out', () => {
        // The sidebar is opened in order to draw the user's attention to
        // the `You must be logged in to create annotations and highlights` message.
        const annotation = fixtures.newHighlight();
        // The user is not logged-in.
        annotation.user = fakeSession.state.userid = undefined;

        createDirective(annotation);

        assert.calledWith(fakeBridge.call, 'showSidebar');
      });

      it('does not save new annotations on initialization', function() {
        const annotation = fixtures.newAnnotation();

        createDirective(annotation);

        assert.notCalled(fakeApi.annotation.create);
      });

      it('does not save old highlights on initialization', function() {
        const annotation = fixtures.oldHighlight();

        createDirective(annotation);

        assert.notCalled(fakeApi.annotation.create);
      });

      it('does not save old annotations on initialization', function() {
        const annotation = fixtures.oldAnnotation();

        createDirective(annotation);

        assert.notCalled(fakeApi.annotation.create);
      });

      it('creates drafts for new annotations on initialization', function() {
        const annotation = fixtures.newAnnotation();
        createDirective(annotation);
        assert.calledWith(fakeStore.createDraft, annotation, {
          isPrivate: false,
          tags: annotation.tags,
          text: annotation.text,
        });
      });

      it('does not create drafts for new highlights on initialization', function() {
        const annotation = fixtures.newHighlight();
        const controller = createDirective(annotation).controller;

        assert.notOk(controller.editing());
        assert.notCalled(fakeStore.createDraft);
      });

      it('edits annotations with drafts on initialization', function() {
        const annotation = fixtures.oldAnnotation();
        // The drafts store has some draft changes for this annotation.
        fakeStore.getDraft.returns({ text: 'foo', tags: [] });

        const controller = createDirective(annotation).controller;

        assert.isTrue(controller.editing());
      });
    });

    describe('#editing()', function() {
      it('returns false if the annotation does not have a draft', function() {
        const controller = createDirective().controller;
        assert.notOk(controller.editing());
      });

      it('returns true if the annotation has a draft', function() {
        const controller = createDirective().controller;
        fakeStore.getDraft.returns({ tags: [], text: '', isPrivate: false });
        assert.isTrue(controller.editing());
      });

      it('returns false if the annotation has a draft but is being saved', function() {
        const controller = createDirective().controller;
        fakeStore.getDraft.returns({ tags: [], text: '', isPrivate: false });
        controller.isSaving = true;
        assert.isFalse(controller.editing());
      });
    });

    describe('#isHighlight()', function() {
      it('returns true for new highlights', function() {
        const annotation = fixtures.newHighlight();

        const vm = createDirective(annotation).controller;

        assert.isTrue(vm.isHighlight());
      });

      it('returns false for new annotations', function() {
        const annotation = fixtures.newAnnotation();

        const vm = createDirective(annotation).controller;

        assert.isFalse(vm.isHighlight());
      });

      it('returns false for page notes', function() {
        const annotation = fixtures.oldPageNote();

        const vm = createDirective(annotation).controller;

        assert.isFalse(vm.isHighlight());
      });

      it('returns false for replies', function() {
        const annotation = fixtures.oldReply();

        const vm = createDirective(annotation).controller;

        assert.isFalse(vm.isHighlight());
      });

      it('returns false for annotations with text but no tags', function() {
        const annotation = fixtures.oldAnnotation();
        annotation.text = 'This is my annotation';
        annotation.tags = [];

        const vm = createDirective(annotation).controller;

        assert.isFalse(vm.isHighlight());
      });

      it('returns false for annotations with tags but no text', function() {
        const annotation = fixtures.oldAnnotation();
        annotation.text = '';
        annotation.tags = ['foo'];

        const vm = createDirective(annotation).controller;

        assert.isFalse(vm.isHighlight());
      });

      it('returns true for annotations with no text or tags', function() {
        const annotation = fixtures.oldAnnotation();
        annotation.text = '';
        annotation.tags = [];

        const vm = createDirective(annotation).controller;

        assert.isTrue(vm.isHighlight());
      });

      it('returns false for censored annotations', function() {
        const ann = Object.assign(fixtures.oldAnnotation(), {
          hidden: true,
          text: '',
          tags: [],
        });

        const vm = createDirective(ann).controller;

        assert.isFalse(vm.isHighlight());
      });
    });

    describe('when the annotation is a highlight', function() {
      let annotation;

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
      let annotation;

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
        const controller = createDirective(annotation).controller;
        const reply = sinon.match({
          references: [annotation.id],
          target: [
            {
              source: annotation.target[0].source,
            },
          ],
          uri: annotation.uri,
        });
        controller.reply();
        assert.calledWith(fakeAnnotationMapper.createAnnotation, reply);
      });

      it('makes the reply shared if the parent is shared', function() {
        const controller = createDirective(annotation).controller;
        const perms = { read: ['agroup'] };
        const reply = sinon.match({
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
        const controller = createDirective(annotation).controller;
        fakePermissions.isShared.returns(false);
        const perms = { read: ['onlyme'] };
        fakePermissions.private.returns(perms);
        const reply = sinon.match({ permissions: perms });
        controller.reply();
        assert.calledWith(fakeAnnotationMapper.createAnnotation, reply);
      });

      it("sets the reply's group to be the same as its parent's", function() {
        const annotation = fixtures.defaultAnnotation();
        annotation.group = 'my group';
        const controller = createDirective(annotation).controller;
        const reply = sinon.match({ group: annotation.group });
        controller.reply();
        assert.calledWith(fakeAnnotationMapper.createAnnotation, reply);
      });
    });

    describe('#setPrivacy', function() {
      it('makes the annotation private when level is "private"', function() {
        const parts = createDirective();
        parts.controller.setPrivacy('private');
        assert.calledWith(
          fakeStore.createDraft,
          parts.controller.annotation,
          sinon.match({
            isPrivate: true,
          })
        );
      });

      it('makes the annotation shared when level is "shared"', function() {
        const parts = createDirective();
        parts.controller.setPrivacy('shared');
        assert.calledWith(
          fakeStore.createDraft,
          parts.controller.annotation,
          sinon.match({
            isPrivate: false,
          })
        );
      });

      it('sets the default visibility level if "shared"', function() {
        const parts = createDirective();
        parts.controller.edit();
        parts.controller.setPrivacy('shared');
        assert.calledWith(fakePermissions.setDefault, 'shared');
      });

      it('sets the default visibility if "private"', function() {
        const parts = createDirective();
        parts.controller.edit();
        parts.controller.setPrivacy('private');
        assert.calledWith(fakePermissions.setDefault, 'private');
      });

      it("doesn't save the visibility if the annotation is a reply", function() {
        const parts = createDirective(fixtures.oldReply());
        parts.controller.setPrivacy('private');
        assert.notCalled(fakePermissions.setDefault);
      });
    });

    describe('#hasContent', function() {
      it('returns false if the annotation has no tags or text', function() {
        const controller = createDirective(fixtures.oldHighlight()).controller;
        assert.ok(!controller.hasContent());
      });

      it('returns true if the annotation has tags or text', function() {
        const controller = createDirective(fixtures.oldAnnotation()).controller;
        assert.ok(controller.hasContent());
      });
    });

    describe('#quote', function() {
      it('returns `null` if the annotation has no quotes', function() {
        const annotation = fixtures.defaultAnnotation();
        annotation.target = [{}];
        const controller = createDirective(annotation).controller;

        assert.isNull(controller.quote());
      });

      it('returns `null` if the annotation has selectors but no quote selector', function() {
        const annotation = fixtures.defaultAnnotation();
        annotation.target = [
          {
            selector: [],
          },
        ];
        const controller = createDirective(annotation).controller;

        assert.isNull(controller.quote());
      });

      it("returns the first quote's text if the annotation has quotes", function() {
        const annotation = fixtures.defaultAnnotation();
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
        const controller = createDirective(annotation).controller;

        assert.equal(controller.quote(), 'The text that the user selected');
      });
    });

    describe('#delete()', function() {
      beforeEach(function() {
        fakeAnnotationMapper.deleteAnnotation = sandbox.stub();
      });

      it('calls annotationMapper.delete() if the delete is confirmed', function(done) {
        const parts = createDirective();
        sandbox.stub($window, 'confirm').returns(true);
        fakeAnnotationMapper.deleteAnnotation.returns($q.resolve());
        parts.controller.delete().then(function() {
          assert.calledWith(
            fakeAnnotationMapper.deleteAnnotation,
            parts.annotation
          );
          done();
        });
        $timeout.flush();
      });

      it("doesn't call annotationMapper.delete() if the delete is cancelled", function(done) {
        const parts = createDirective();
        sandbox.stub($window, 'confirm').returns(false);
        parts.controller.delete().then(function() {
          assert.notCalled(fakeAnnotationMapper.deleteAnnotation);
          done();
        });
        $timeout.flush();
      });

      it('flashes an error if the delete fails on the server', function(done) {
        const controller = createDirective().controller;
        sandbox.stub($window, 'confirm').returns(true);

        fakeAnnotationMapper.deleteAnnotation = sinon.spy(() => {
          // nb. we only instantiate the rejected promise when
          // `deleteAnnotation` is called to avoid triggering `$q`'s unhandled
          // promise rejection handler during the `$timeout.flush()` call.
          return $q.reject(new Error('500 Server Error'));
        });
        controller.delete().then(function() {
          assert.calledWith(
            fakeFlash.error,
            '500 Server Error',
            'Deleting annotation failed'
          );
          done();
        });
        $timeout.flush();
      });

      it("doesn't flash an error if the delete succeeds", function(done) {
        const controller = createDirective().controller;
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

        it("doesn't try to flag the annotation", function() {
          createDirective().controller.flag();

          assert.isFalse(fakeAnnotationMapper.flagAnnotation.called);
        });
      });

      context('when the user is logged in', function() {
        it('calls annotationMapper.flag() when an annotation is flagged', function(done) {
          const parts = createDirective();
          fakeAnnotationMapper.flagAnnotation.returns($q.resolve());
          parts.controller.flag();
          assert.calledWith(
            fakeAnnotationMapper.flagAnnotation,
            parts.annotation
          );
          done();
        });

        it('flashes an error if the flag fails', function(done) {
          const controller = createDirective().controller;
          const err = new Error('500 Server error');
          fakeAnnotationMapper.flagAnnotation.returns(Promise.reject(err));
          controller.flag();
          setTimeout(function() {
            assert.calledWith(
              fakeFlash.error,
              '500 Server error',
              'Flagging annotation failed'
            );
            done();
          }, 0);
        });

        it("doesn't flash an error if the flag succeeds", function(done) {
          const controller = createDirective().controller;
          fakeAnnotationMapper.flagAnnotation.returns($q.resolve());
          controller.flag();
          setTimeout(function() {
            assert.notCalled(fakeFlash.error);
            done();
          }, 0);
        });
      });
    });

    describe('#isThirdPartyUser', function() {
      it('returns whether the user is a third party user', function() {
        const { annotation, controller } = createDirective();

        const returned = controller.isThirdPartyUser();

        assert.calledOnce(fakeAccountID.isThirdPartyUser);
        assert.alwaysCalledWithExactly(
          fakeAccountID.isThirdPartyUser,
          annotation.user,
          fakeSettings.authDomain
        );
        assert.equal(returned, fakeAccountID.isThirdPartyUser());
      });
    });

    describe('#isDeleted', function() {
      it('returns true if the annotation has been marked as deleted', function() {
        const controller = createDirective().controller;
        fakeStore.hasPendingDeletion.returns(true);
        assert.equal(controller.isDeleted(), true);
      });

      it('returns false if the annotation has not been marked as deleted', function() {
        const controller = createDirective().controller;
        fakeStore.hasPendingDeletion.returns(false);
        assert.equal(controller.isDeleted(), false);
      });
    });

    describe('#isOrphan', function() {
      it('returns false if the annotation is not an orphan', function() {
        const controller = createDirective().controller;
        controller.annotation.$orphan = false;
        assert.isFalse(controller.isOrphan());
      });

      it('returns true if the annotation is an orphan', function() {
        const controller = createDirective().controller;
        controller.annotation.$orphan = true;
        assert.isTrue(controller.isOrphan());
      });

      it('returns true if the anchoring timeout expired', function() {
        const controller = createDirective().controller;
        controller.annotation.$anchorTimeout = true;
        assert.isTrue(controller.isOrphan());
      });

      it('returns false if the anchoring timeout expired but anchoring did complete', function() {
        const controller = createDirective().controller;
        controller.annotation.$orphan = false;
        controller.annotation.$anchorTimeout = true;
        assert.isFalse(controller.isOrphan());
      });
    });

    describe('#canFlag', function() {
      it('returns false if the user signed in is the same as the author of the annotation', function() {
        const ann = fixtures.defaultAnnotation();
        const controller = createDirective(ann).controller;
        assert.isFalse(controller.canFlag());
      });

      it('returns true if the user signed in is different from the author of the annotation', function() {
        const ann = fixtures.thirdPartyAnnotation();
        const controller = createDirective(ann).controller;
        assert.isTrue(controller.canFlag());
      });
    });

    describe('#shouldShowLicense', function() {
      unroll(
        'returns #expected if #case_',
        function(testCase) {
          const ann = fixtures.publicAnnotation();
          ann.group = testCase.group.id;
          fakeStore.getDraft.returns(testCase.draft);
          fakeGroups.get.returns(testCase.group);

          const controller = createDirective(ann).controller;

          assert.equal(controller.shouldShowLicense(), testCase.expected);
        },
        [
          {
            case_: 'the annotation is not being edited',
            draft: null,
            group: groupFixtures.open,
            expected: false,
          },
          {
            case_: 'the draft is private',
            draft: draftFixtures.private,
            group: groupFixtures.open,
            expected: false,
          },
          {
            case_: 'the group is private',
            draft: draftFixtures.shared,
            group: groupFixtures.private,
            expected: false,
          },
          {
            case_: 'the draft is shared and the group is open',
            draft: draftFixtures.shared,
            group: groupFixtures.open,
            expected: true,
          },
          {
            case_: 'the draft is shared and the group is restricted',
            draft: draftFixtures.shared,
            group: groupFixtures.restricted,
            expected: true,
          },
        ]
      );
    });

    describe('#authorize', function() {
      it('passes the current permissions and logged-in user ID to the permissions service', function() {
        const ann = fixtures.defaultAnnotation();
        ann.permissions = {
          read: [fakeSession.state.userid],
          delete: [fakeSession.state.userid],
          update: [fakeSession.state.userid],
        };
        const controller = createDirective(ann).controller;

        ['update', 'delete'].forEach(function(action) {
          controller.authorize(action);
          assert.calledWith(
            fakePermissions.permits,
            ann.permissions,
            action,
            fakeSession.state.userid
          );
        });
      });
    });

    describe('saving a new annotation', function() {
      let annotation;

      beforeEach(function() {
        annotation = fixtures.newAnnotation();
      });

      function createController() {
        return createDirective(annotation).controller;
      }

      it('removes the draft when saving an annotation succeeds', function() {
        const controller = createController();
        return controller.save().then(function() {
          assert.calledWith(fakeStore.removeDraft, annotation);
        });
      });

      it('emits annotationCreated when saving an annotation succeeds', function() {
        const controller = createController();
        sandbox.spy($rootScope, '$broadcast');
        return controller.save().then(function() {
          assert.calledWith($rootScope.$broadcast, events.ANNOTATION_CREATED);
        });
      });

      it('flashes an error if saving the annotation fails on the server', function() {
        const controller = createController();
        const err = new Error('500 Server Error');
        fakeApi.annotation.create = sinon.stub().returns(Promise.reject(err));
        return controller.save().then(function() {
          assert.calledWith(
            fakeFlash.error,
            '500 Server Error',
            'Saving annotation failed'
          );
        });
      });

      it("doesn't flash an error when saving an annotation succeeds", function() {
        const controller = createController();
        return controller.save().then(function() {
          assert.notCalled(fakeFlash.error);
        });
      });

      it('shows a saving indicator when saving an annotation', function() {
        const controller = createController();
        let create;
        fakeApi.annotation.create = sinon.stub().returns(
          new Promise(function(resolve) {
            create = resolve;
          })
        );
        const saved = controller.save();
        assert.equal(controller.isSaving, true);
        create(Object.assign({}, controller.annotation, { id: 'new-id' }));
        return saved.then(function() {
          assert.equal(controller.isSaving, false);
        });
      });

      it('does not remove the draft if saving fails', function() {
        const controller = createController();
        fakeApi.annotation.create = sinon
          .stub()
          .returns(Promise.reject({ status: -1 }));
        return controller.save().then(function() {
          assert.notCalled(fakeStore.removeDraft);
        });
      });

      it("sets the annotation's group to the focused group", function() {
        fakeGroups.focused = function() {
          return { id: 'test-id' };
        };
        const controller = createDirective(fixtures.newAnnotation()).controller;
        assert.equal(controller.annotation.group, 'test-id');
      });
    });

    describe('saving an edited an annotation', function() {
      let annotation;

      beforeEach(function() {
        annotation = fixtures.defaultAnnotation();
        fakeStore.getDraft.returns({ text: 'unsaved change' });
      });

      function createController() {
        return createDirective(annotation).controller;
      }

      it('flashes an error if saving the annotation fails on the server', function() {
        const controller = createController();
        const err = new Error('500 Server Error');
        fakeApi.annotation.update = sinon.stub().returns(Promise.reject(err));
        return controller.save().then(function() {
          assert.calledWith(
            fakeFlash.error,
            '500 Server Error',
            'Saving annotation failed'
          );
        });
      });

      it("doesn't flash an error if saving the annotation succeeds", function() {
        const controller = createController();
        return controller.save().then(function() {
          assert.notCalled(fakeFlash.error);
        });
      });
    });

    describe('drafts', function() {
      it('starts editing immediately if there is a draft', function() {
        fakeStore.getDraft.returns({
          tags: ['unsaved'],
          text: 'unsaved-text',
        });
        const controller = createDirective().controller;
        assert.isTrue(controller.editing());
      });

      it('uses the text and tags from the draft if present', function() {
        fakeStore.getDraft.returns({
          tags: ['unsaved-tag'],
          text: 'unsaved-text',
        });
        const controller = createDirective().controller;
        assert.deepEqual(controller.state().tags, ['unsaved-tag']);
        assert.equal(controller.state().text, 'unsaved-text');
      });

      it('removes the draft when changes are discarded', function() {
        const parts = createDirective();
        parts.controller.edit();
        parts.controller.revert();
        assert.calledWith(fakeStore.removeDraft, parts.annotation);
      });

      it('removes the draft when changes are saved', function() {
        const annotation = fixtures.defaultAnnotation();
        const controller = createDirective(annotation).controller;
        fakeStore.getDraft.returns({ text: 'unsaved changes' });
        return controller.save().then(function() {
          assert.calledWith(fakeStore.removeDraft, annotation);
        });
      });
    });

    describe('reverting edits', function() {
      it('removes the current draft', function() {
        const controller = createDirective(fixtures.defaultAnnotation())
          .controller;
        controller.edit();
        controller.revert();
        assert.calledWith(fakeStore.removeDraft, controller.annotation);
      });

      it('deletes the annotation if it was new', function() {
        const controller = createDirective(fixtures.newAnnotation()).controller;
        sandbox.spy($rootScope, '$broadcast');
        controller.revert();
        assert.calledWith($rootScope.$broadcast, events.ANNOTATION_DELETED);
      });
    });

    describe('tag display', function() {
      beforeEach('make serviceUrl() return a URL for the tag', function() {
        fakeServiceUrl
          .withArgs('search.tag', { tag: 'atag' })
          .returns('https://hypothes.is/search?q=tag:atag');
      });

      /**
       * Return an annotation directive with a single tag.
       */
      function annotationWithOneTag() {
        return createDirective(
          Object.assign(fixtures.defaultAnnotation(), {
            tags: ['atag'],
          })
        );
      }

      /**
       * Return the one tag link element from the given annotation directive.
       */
      function tagLinkFrom(directive) {
        const links = [].slice.apply(
          directive.element[0].querySelectorAll('a')
        );
        const tagLinks = links.filter(function(link) {
          return link.textContent === 'atag';
        });
        assert.equal(tagLinks.length, 1);
        return tagLinks[0];
      }

      context('when the annotation is first-party', function() {
        beforeEach('configure a first-party annotation', function() {
          fakeAccountID.isThirdPartyUser.returns(false);
        });

        it('displays links to tag search pages', function() {
          const tagLink = tagLinkFrom(annotationWithOneTag());

          assert.equal(tagLink.href, 'https://hypothes.is/search?q=tag:atag');
        });
      });

      context('when the annotation is third-party', function() {
        beforeEach('configure a third-party annotation', function() {
          fakeAccountID.isThirdPartyUser.returns(true);
        });

        it("doesn't link tags for third-party annotations", function() {
          // Tag search pages aren't supported for third-party annotations in
          // h, so we don't link to them in the client.
          const tagLink = tagLinkFrom(annotationWithOneTag());

          assert.isFalse(tagLink.hasAttribute('href'));
        });
      });
    });

    describe('annotation links', function() {
      it('uses the in-context links when available', function() {
        const annotation = Object.assign({}, fixtures.defaultAnnotation(), {
          links: {
            incontext: 'https://hpt.is/deadbeef',
          },
        });
        const controller = createDirective(annotation).controller;
        assert.equal(controller.incontextLink(), annotation.links.incontext);
      });

      it('falls back to the HTML link when in-context links are missing', function() {
        const annotation = Object.assign({}, fixtures.defaultAnnotation(), {
          links: {
            html: 'https://test.hypothes.is/a/deadbeef',
          },
        });
        const controller = createDirective(annotation).controller;
        assert.equal(controller.incontextLink(), annotation.links.html);
      });

      it('in-context link is blank when unknown', function() {
        const annotation = fixtures.defaultAnnotation();
        const controller = createDirective(annotation).controller;
        assert.equal(controller.incontextLink(), '');
      });

      [true, false].forEach(enableShareLinks => {
        it('does not render links if share links are globally disabled', () => {
          const annotation = Object.assign({}, fixtures.defaultAnnotation(), {
            links: {
              incontext: 'https://hpt.is/deadbeef',
            },
          });
          fakeSettings.services = [
            {
              enableShareLinks,
            },
          ];
          const controller = createDirective(annotation).controller;
          const hasIncontextLink =
            controller.incontextLink() === annotation.links.incontext;
          assert.equal(hasIncontextLink, enableShareLinks);
        });
      });
    });

    it('renders quotes as plain text', function() {
      const ann = fixtures.defaultAnnotation();
      ann.target[0].selector = [
        {
          type: 'TextQuoteSelector',
          exact: '<<-&->>',
        },
      ];
      const el = createDirective(ann).element;
      assert.equal(el[0].querySelector('blockquote').textContent, '<<-&->>');
    });

    unroll(
      'renders hidden annotations with a custom text class (#context)',
      function(testCase) {
        const el = createDirective(testCase.ann).element;
        assert.match(
          el.find('markdown').controller('markdown'),
          sinon.match({
            customTextClass: testCase.textClass,
          })
        );
      },
      [
        {
          context: 'for moderators',
          ann: Object.assign(fixtures.moderatedAnnotation({ hidden: true }), {
            // Content still present.
            text: 'Some offensive content',
          }),
          textClass: {
            'annotation-body is-hidden': true,
            'has-content': true,
          },
        },
        {
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
        },
      ]
    );

    it('flags the annotation when the user clicks the "Flag" button', function() {
      fakeAnnotationMapper.flagAnnotation.returns(Promise.resolve());
      const ann = Object.assign(fixtures.defaultAnnotation(), {
        user: 'acct:notCurrentUser@localhost',
      });
      const el = createDirective(ann).element;
      const flagBtn = findActionButton(
        el,
        'Report this annotation to the moderators'
      );
      flagBtn.onClick();
      assert.called(fakeAnnotationMapper.flagAnnotation);
    });

    it('highlights the "Flag" button if the annotation is flagged', function() {
      const ann = Object.assign(fixtures.defaultAnnotation(), {
        flagged: true,
        user: 'acct:notCurrentUser@localhost',
      });
      const el = createDirective(ann).element;
      const flaggedBtn = findActionButton(
        el,
        'Annotation has been reported to the moderators'
      );
      assert.ok(flaggedBtn);
    });
  });
});
