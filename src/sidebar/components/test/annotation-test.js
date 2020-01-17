import angular from 'angular';

import * as util from '../../directive/test/util';
import events from '../../events';
import * as fixtures from '../../test/annotation-fixtures';
import annotationComponent from '../annotation';
import { $imports, updateModel } from '../annotation';

const inject = angular.mock.inject;

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

describe('annotation', function() {
  describe('updateModel()', function() {
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
    let $rootScope;
    let $scope;
    const fakeAccountID = {
      isThirdPartyUser: sinon.stub(),
    };
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
      $imports.$mock({
        '../util/account-id': fakeAccountID,
      });
    });

    afterEach(() => {
      $imports.$restore();
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
        .component('annotationBody', {
          bindings: {
            collapse: '<',
            isEditing: '<',
            isHiddenByModerator: '<',
            onCollapsibleChanged: '&',
            onEditText: '&',
            onToggleCollapsed: '&',
            text: '<',
          },
        })
        .component('annotationQuote', {
          bindings: {
            annotation: '<',
          },
        });
    });

    beforeEach(angular.mock.module('h'));
    beforeEach(
      angular.mock.module(function($provide) {
        sandbox = sinon.createSandbox();

        fakeAnnotationMapper = {
          createAnnotation: sandbox.stub().returns({
            permissions: {
              read: ['acct:bill@localhost'],
              update: ['acct:bill@localhost'],
              destroy: ['acct:bill@localhost'],
              admin: ['acct:bill@localhost'],
            },
          }),
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

    beforeEach(inject(function(_$rootScope_) {
      $rootScope = _$rootScope_;
      $scope = $rootScope.$new();
    }));

    afterEach(function() {
      sandbox.restore();
    });

    describe('initialization', function() {
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
      it("returns the annotation's quote", () => {
        const ann = fixtures.defaultAnnotation();
        const controller = createDirective(ann).controller;
        ann.target[0].selector = [
          { type: 'TextQuoteSelector', exact: 'test quote' },
        ];
        assert.equal(controller.quote(), 'test quote');
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

    describe('#shouldShowLicense', function() {
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
      ].forEach(testCase => {
        it(`returns ${testCase.expected} if ${testCase.case_}`, () => {
          const ann = fixtures.publicAnnotation();
          ann.group = testCase.group.id;
          fakeStore.getDraft.returns(testCase.draft);
          fakeGroups.get.returns(testCase.group);

          const controller = createDirective(ann).controller;

          assert.equal(controller.shouldShowLicense(), testCase.expected);
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

    [
      {
        context: 'for moderators',
        ann: Object.assign(fixtures.moderatedAnnotation({ hidden: true }), {
          // Content still present.
          text: 'Some offensive content',
        }),
        isHiddenByModerator: true,
      },
      {
        context: 'for non-moderators',
        ann: Object.assign(fixtures.moderatedAnnotation({ hidden: true }), {
          // Content filtered out by service.
          tags: [],
          text: '',
        }),
        isHiddenByModerator: true,
      },
    ].forEach(({ ann, context, isHiddenByModerator }) => {
      it(`passes moderation status to annotation body (${context})`, () => {
        const el = createDirective(ann).element;
        assert.match(
          el.find('annotation-body').controller('annotationBody'),
          sinon.match({
            isHiddenByModerator,
          })
        );
      });
    });
  });
});
