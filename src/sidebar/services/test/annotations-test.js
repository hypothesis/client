import EventEmitter from 'tiny-emitter';

import * as fixtures from '../../test/annotation-fixtures';
import uiConstants from '../../ui-constants';

import annotationsService from '../annotations';
import { $imports } from '../annotations';

let searchClients;
let longRunningSearchClient = false;
class FakeSearchClient extends EventEmitter {
  constructor(searchFn, opts) {
    super();

    assert.ok(searchFn);
    searchClients.push(this);
    this.cancel = sinon.stub();
    this.incremental = !!opts.incremental;

    this.get = sinon.spy(query => {
      assert.ok(query.uri);

      for (let i = 0; i < query.uri.length; i++) {
        const uri = query.uri[i];
        this.emit('results', [{ id: uri + '123', group: '__world__' }]);
        this.emit('results', [{ id: uri + '456', group: 'private-group' }]);
      }
      if (!longRunningSearchClient) {
        this.emit('end');
      }
    });
  }
}

describe('annotationService', () => {
  let fakeStore;
  let fakeApi;
  let fakeAnnotationMapper;
  let fakeStreamer;
  let fakeStreamFilter;

  let fakeMetadata;
  let fakeUris;
  let fakeGroupId;

  let fakeDefaultPermissions;
  let fakePrivatePermissions;
  let fakeSharedPermissions;

  beforeEach(() => {
    sinon.stub(console, 'error');
    searchClients = [];
    longRunningSearchClient = false;

    fakeAnnotationMapper = {
      loadAnnotations: sinon.stub(),
      unloadAnnotations: sinon.stub(),
    };

    fakeApi = {
      annotation: {
        create: sinon.stub().resolves(fixtures.defaultAnnotation()),
        update: sinon.stub().resolves(fixtures.defaultAnnotation()),
      },
      search: sinon.stub(),
    };

    fakeDefaultPermissions = sinon.stub();

    fakePrivatePermissions = sinon.stub().returns({
      read: ['acct:foo@bar.com'],
      update: ['acct:foo@bar.com'],
      delete: ['acct:foo@bar.com'],
    });
    fakeSharedPermissions = sinon.stub().returns({
      read: ['group:__world__'],
    });

    fakeMetadata = {
      isAnnotation: sinon.stub(),
      isHighlight: sinon.stub(),
      isNew: sinon.stub(),
      isPageNote: sinon.stub(),
      isPublic: sinon.stub(),
    };

    fakeStore = {
      addAnnotations: sinon.stub(),
      annotationFetchFinished: sinon.stub(),
      annotationFetchStarted: sinon.stub(),
      createDraft: sinon.stub(),
      deleteNewAndEmptyDrafts: sinon.stub(),
      focusedGroupId: sinon.stub(),
      frames: sinon.stub(),
      getDefault: sinon.stub(),
      getDraft: sinon.stub().returns(null),
      profile: sinon.stub().returns({}),
      removeDraft: sinon.stub(),
      savedAnnotations: sinon.stub(),
      selectTab: sinon.stub(),
      setCollapsed: sinon.stub(),
      updateFrameAnnotationFetchStatus: sinon.stub(),
    };

    fakeStreamer = {
      setConfig: sinon.stub(),
      connect: sinon.stub(),
      reconnect: sinon.stub(),
    };
    fakeStreamFilter = {
      resetFilter: sinon.stub().returns({
        addClause: sinon.stub(),
      }),
      getFilter: sinon.stub().returns({}),
    };
    fakeUris = ['http://example.com'];
    fakeGroupId = 'group-id';

    $imports.$mock({
      '../search-client': FakeSearchClient,
      '../util/annotation-metadata': fakeMetadata,
      '../util/permissions': {
        defaultPermissions: fakeDefaultPermissions,
        privatePermissions: fakePrivatePermissions,
        sharedPermissions: fakeSharedPermissions,
      },
    });
  });

  afterEach(() => {
    console.error.restore();
    $imports.$restore();
  });

  function service() {
    fakeStore.frames.returns(
      fakeUris.map(uri => {
        return { uri: uri };
      })
    );
    return annotationsService(
      fakeAnnotationMapper,
      fakeApi,
      fakeStore,
      fakeStreamer,
      fakeStreamFilter
    );
  }

  describe('create', () => {
    let now;
    let svc;

    const getLastAddedAnnotation = () => {
      if (fakeStore.addAnnotations.callCount <= 0) {
        return null;
      }
      const callCount = fakeStore.addAnnotations.callCount;
      return fakeStore.addAnnotations.getCall(callCount - 1).args[0][0];
    };

    beforeEach(() => {
      now = new Date();
      svc = service();

      fakeStore.focusedGroupId.returns('mygroup');
      fakeStore.profile.returns({
        userid: 'acct:foo@bar.com',
        user_info: {},
      });
    });

    it('extends the provided annotation object with defaults', () => {
      fakeStore.focusedGroupId.returns('mygroup');

      svc.create({}, now);

      const annotation = getLastAddedAnnotation();

      assert.equal(annotation.created, now.toISOString());
      assert.equal(annotation.group, 'mygroup');
      assert.isArray(annotation.tags);
      assert.isEmpty(annotation.tags);
      assert.isString(annotation.text);
      assert.isEmpty(annotation.text);
      assert.equal(annotation.updated, now.toISOString());
      assert.equal(annotation.user, 'acct:foo@bar.com');
      assert.isOk(annotation.$tag);
      assert.isString(annotation.$tag);
    });

    describe('annotation permissions', () => {
      it('sets private permissions if default privacy level is "private"', () => {
        fakeStore.getDefault.returns('private');
        fakeDefaultPermissions.returns('private-permissions');

        svc.create({}, now);
        const annotation = getLastAddedAnnotation();

        assert.calledOnce(fakeDefaultPermissions);
        assert.calledWith(
          fakeDefaultPermissions,
          'acct:foo@bar.com',
          'mygroup',
          'private'
        );
        assert.equal(annotation.permissions, 'private-permissions');
      });

      it('sets shared permissions if default privacy level is "shared"', () => {
        fakeStore.getDefault.returns('shared');
        fakeDefaultPermissions.returns('default permissions');

        svc.create({}, now);
        const annotation = getLastAddedAnnotation();

        assert.calledOnce(fakeDefaultPermissions);
        assert.calledWith(
          fakeDefaultPermissions,
          'acct:foo@bar.com',
          'mygroup',
          'shared'
        );
        assert.equal(annotation.permissions, 'default permissions');
      });

      it('sets private permissions if annotation is a highlight', () => {
        fakeMetadata.isHighlight.returns(true);
        fakePrivatePermissions.returns('private permissions');
        fakeDefaultPermissions.returns('default permissions');

        svc.create({}, now);
        const annotation = getLastAddedAnnotation();

        assert.calledOnce(fakePrivatePermissions);
        assert.equal(annotation.permissions, 'private permissions');
      });
    });

    it('creates a draft for the new annotation', () => {
      fakeMetadata.isHighlight.returns(false);

      svc.create(fixtures.newAnnotation(), now);

      assert.calledOnce(fakeStore.createDraft);
    });

    it('adds the annotation to the store', () => {
      svc.create(fixtures.newAnnotation(), now);

      assert.calledOnce(fakeStore.addAnnotations);
    });

    it('deletes other empty drafts for new annotations', () => {
      svc.create(fixtures.newAnnotation(), now);

      assert.calledOnce(fakeStore.deleteNewAndEmptyDrafts);
    });

    it('does not create a draft if the annotation is a highlight', () => {
      fakeMetadata.isHighlight.returns(true);

      svc.create(fixtures.newAnnotation(), now);

      assert.notCalled(fakeStore.createDraft);
    });

    describe('automatic tab selection', () => {
      it('sets the active tab to "Page Notes" if the annotation is a Page Note', () => {
        fakeMetadata.isPageNote.returns(true);

        svc.create(fixtures.newAnnotation(), now);

        assert.calledOnce(fakeStore.selectTab);
        assert.calledWith(fakeStore.selectTab, uiConstants.TAB_NOTES);
      });

      it('sets the active tab to "Annotations" if the annotation is an annotation', () => {
        fakeMetadata.isAnnotation.returns(true);

        svc.create(fixtures.newAnnotation(), now);

        assert.calledOnce(fakeStore.selectTab);
        assert.calledWith(fakeStore.selectTab, uiConstants.TAB_ANNOTATIONS);
      });

      it('does nothing if the annotation is neither an annotation nor a page note (e.g. reply)', () => {
        fakeMetadata.isAnnotation.returns(false);
        fakeMetadata.isPageNote.returns(false);

        svc.create(fixtures.newAnnotation(), now);

        assert.notCalled(fakeStore.selectTab);
      });
    });

    it("expands all of the new annotation's parents", () => {
      const annot = fixtures.newAnnotation();
      annot.references = ['aparent', 'anotherparent', 'yetanotherancestor'];

      svc.create(annot, now);

      assert.equal(fakeStore.setCollapsed.callCount, 3);
      assert.calledWith(fakeStore.setCollapsed, 'aparent', false);
      assert.calledWith(fakeStore.setCollapsed, 'anotherparent', false);
      assert.calledWith(fakeStore.setCollapsed, 'yetanotherancestor', false);
    });
  });

  describe('load', () => {
    it('unloads any existing annotations', () => {
      // When new clients connect, all existing annotations should be unloaded
      // before reloading annotations for each currently-connected client.
      fakeStore.savedAnnotations.returns([
        { id: fakeUris[0] + '123' },
        { id: fakeUris[0] + '456' },
      ]);
      const svc = service();

      svc.load(fakeUris, fakeGroupId);
      assert.calledWith(fakeAnnotationMapper.unloadAnnotations, [
        sinon.match({ id: fakeUris[0] + '123' }),
        sinon.match({ id: fakeUris[0] + '456' }),
      ]);
    });

    it('loads all annotations for a URI', () => {
      const svc = service();

      svc.load(fakeUris, fakeGroupId);
      assert.calledWith(fakeAnnotationMapper.loadAnnotations, [
        sinon.match({ id: fakeUris[0] + '123' }),
      ]);
      assert.calledWith(fakeAnnotationMapper.loadAnnotations, [
        sinon.match({ id: fakeUris[0] + '456' }),
      ]);
    });

    it('loads all annotations for a frame with multiple URIs', () => {
      const uri = 'http://example.com/test.pdf';
      const fingerprint = 'urn:x-pdf:fingerprint';
      fakeUris = [uri, fingerprint];
      const svc = service();
      // Override the default frames set by the service call above.
      fakeStore.frames.returns([
        {
          uri: uri,
          metadata: {
            documentFingerprint: 'fingerprint',
            link: [
              {
                href: fingerprint,
              },
              {
                href: uri,
              },
            ],
          },
        },
      ]);

      svc.load(fakeUris, fakeGroupId);
      assert.calledWith(fakeAnnotationMapper.loadAnnotations, [
        sinon.match({ id: uri + '123' }),
      ]);
      assert.calledWith(fakeAnnotationMapper.loadAnnotations, [
        sinon.match({ id: fingerprint + '123' }),
      ]);
      assert.calledWith(fakeAnnotationMapper.loadAnnotations, [
        sinon.match({ id: uri + '456' }),
      ]);
      assert.calledWith(fakeAnnotationMapper.loadAnnotations, [
        sinon.match({ id: fingerprint + '456' }),
      ]);
    });

    it('loads all annotations for all URIs', () => {
      fakeUris = ['http://example.com', 'http://foobar.com'];
      const svc = service();

      svc.load(fakeUris, fakeGroupId);

      [
        fakeUris[0] + '123',
        fakeUris[0] + '456',
        fakeUris[1] + '123',
        fakeUris[1] + '456',
      ].forEach(uri => {
        assert.calledWith(fakeAnnotationMapper.loadAnnotations, [
          sinon.match({ id: uri }),
        ]);
      });
    });

    it('updates annotation fetch status for all frames', () => {
      fakeUris = ['http://example.com', 'http://foobar.com'];
      const svc = service();

      svc.load(fakeUris, fakeGroupId);
      assert.calledWith(
        fakeStore.updateFrameAnnotationFetchStatus,
        fakeUris[0],
        true
      );
      assert.calledWith(
        fakeStore.updateFrameAnnotationFetchStatus,
        fakeUris[1],
        true
      );
    });

    it('fetches annotations for the specified group', () => {
      const svc = service();

      svc.load(fakeUris, fakeGroupId);
      assert.calledWith(searchClients[0].get, {
        uri: fakeUris,
        group: fakeGroupId,
      });
    });

    it('loads annotations in batches', () => {
      const svc = service();

      svc.load(fakeUris, fakeGroupId);
      assert.ok(searchClients[0].incremental);
    });

    it("cancels previously search client if it's still running", () => {
      const svc = service();

      // Issue a long running load annotations request.
      longRunningSearchClient = true;
      svc.load(fakeUris, fakeGroupId);
      // Issue another load annotations request while the
      // previous annotation load is still running.
      svc.load(fakeUris, fakeGroupId);

      assert.calledOnce(searchClients[0].cancel);
    });

    it('does not load annotations if URIs list is empty', () => {
      fakeUris = [];
      const svc = service();

      svc.load(fakeUris, fakeGroupId);
      assert.notCalled(fakeAnnotationMapper.loadAnnotations);
    });

    it('calls annotationFetchStarted when it starts searching for annotations', () => {
      const svc = service();

      svc.load(fakeUris, fakeGroupId);

      assert.calledOnce(fakeStore.annotationFetchStarted);
    });

    it('calls annotationFetchFinished when all annotations have been found', () => {
      const svc = service();

      svc.load(fakeUris, fakeGroupId);

      assert.calledOnce(fakeStore.annotationFetchFinished);
    });

    it('logs an error to the console if the search client runs into an error', () => {
      const svc = service();
      const error = new Error('search for annotations failed');

      svc.load(fakeUris, fakeGroupId);
      searchClients[0].emit('error', error);

      assert.calledWith(console.error, error);
    });
  });

  describe('reply', () => {
    let svc;

    beforeEach(() => {
      svc = service();
    });

    const filledAnnotation = () => {
      const annot = fixtures.defaultAnnotation();
      annot.group = 'mix3boop';
      annot.references = ['feedbeef'];

      return annot;
    };

    it('creates a new annotation in the store', () => {
      const annotation = fixtures.defaultAnnotation();

      svc.reply(annotation, 'acct:foo@bar.com');

      assert.calledOnce(fakeStore.addAnnotations);
    });

    it('associates the reply with the annotation', () => {
      const annotation = filledAnnotation();

      svc.reply(annotation, 'acct:foo@bar.com');

      const reply = fakeStore.addAnnotations.getCall(0).args[0][0];

      assert.equal(
        reply.references[reply.references.length - 1],
        annotation.id
      );
      assert.equal(reply.group, annotation.group);
      assert.equal(reply.target[0].source, annotation.target[0].source);
      assert.equal(reply.uri, annotation.uri);
    });

    it('uses public permissions if annotation is public', () => {
      fakeMetadata.isPublic.returns(true);
      fakeSharedPermissions.returns('public');

      const annotation = filledAnnotation();

      svc.reply(annotation, 'acct:foo@bar.com');

      const reply = fakeStore.addAnnotations.getCall(0).args[0][0];
      assert.equal(reply.permissions, 'public');
    });

    it('uses private permissions if annotation is private', () => {
      fakeMetadata.isPublic.returns(false);
      fakePrivatePermissions.returns('private');

      const annotation = filledAnnotation();

      svc.reply(annotation, 'acct:foo@bar.com');

      const reply = fakeStore.addAnnotations.getCall(0).args[0][0];
      assert.equal(reply.permissions, 'private');
    });
  });

  describe('save', () => {
    let svc;

    beforeEach(() => {
      svc = service();
    });

    it('calls the `create` API service for new annotations', () => {
      fakeMetadata.isNew.returns(true);
      // Using the new-annotation fixture has no bearing on which API method
      // will get called because `isNew` is mocked, but it has representative
      // properties
      const annotation = fixtures.newAnnotation();
      return svc.save(annotation).then(() => {
        assert.calledOnce(fakeApi.annotation.create);
        assert.notCalled(fakeApi.annotation.update);
      });
    });

    it('calls the `update` API service for pre-existing annotations', () => {
      fakeMetadata.isNew.returns(false);

      const annotation = fixtures.defaultAnnotation();
      return svc.save(annotation).then(() => {
        assert.calledOnce(fakeApi.annotation.update);
        assert.notCalled(fakeApi.annotation.create);
      });
    });

    it('calls the relevant API service with an object that has any draft changes integrated', () => {
      fakeMetadata.isNew.returns(true);
      fakePrivatePermissions.returns({ read: ['foo'] });
      const annotation = fixtures.defaultAnnotation();
      annotation.text = 'not this';
      annotation.tags = ['nope'];

      fakeStore.getDraft.returns({
        tags: ['one', 'two'],
        text: 'my text',
        isPrivate: true,
        annotation: fixtures.defaultAnnotation(),
      });

      return svc.save(fixtures.defaultAnnotation()).then(() => {
        const annotationWithChanges = fakeApi.annotation.create.getCall(0)
          .args[1];
        assert.equal(annotationWithChanges.text, 'my text');
        assert.sameMembers(annotationWithChanges.tags, ['one', 'two']);
        // Permissions converted to "private"
        assert.include(annotationWithChanges.permissions.read, 'foo');
        assert.notInclude(annotationWithChanges.permissions.read, [
          'group:__world__',
        ]);
      });
    });

    context('successful save', () => {
      it('copies over internal app-specific keys to the annotation object', () => {
        fakeMetadata.isNew.returns(false);
        const annotation = fixtures.defaultAnnotation();
        annotation.$tag = 'mytag';
        annotation.$foo = 'bar';

        // The fixture here has no `$`-prefixed props
        fakeApi.annotation.update.resolves(fixtures.defaultAnnotation());

        return svc.save(annotation).then(() => {
          const savedAnnotation = fakeStore.addAnnotations.getCall(0)
            .args[0][0];
          assert.equal(savedAnnotation.$tag, 'mytag');
          assert.equal(savedAnnotation.$foo, 'bar');
        });
      });

      it('removes the annotation draft', () => {
        const annotation = fixtures.defaultAnnotation();

        return svc.save(annotation).then(() => {
          assert.calledWith(fakeStore.removeDraft, annotation);
        });
      });

      it('adds the updated annotation to the store', () => {
        const annotation = fixtures.defaultAnnotation();
        fakeMetadata.isNew.returns(false);
        fakeApi.annotation.update.resolves(annotation);

        return svc.save(annotation).then(() => {
          assert.calledWith(fakeStore.addAnnotations, [annotation]);
        });
      });
    });

    context('error on save', () => {
      it('does not remove the annotation draft', () => {
        fakeApi.annotation.update.rejects();
        fakeMetadata.isNew.returns(false);

        return svc.save(fixtures.defaultAnnotation()).catch(() => {
          assert.notCalled(fakeStore.removeDraft);
        });
      });

      it('does not add the annotation to the store', () => {
        fakeApi.annotation.update.rejects();
        fakeMetadata.isNew.returns(false);

        return svc.save(fixtures.defaultAnnotation()).catch(() => {
          assert.notCalled(fakeStore.addAnnotations);
        });
      });
    });
  });
});
