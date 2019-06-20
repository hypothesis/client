'use strict';

const angular = require('angular');
const EventEmitter = require('tiny-emitter');

const events = require('../../events');
const sidebarContent = require('../sidebar-content');
const util = require('../../directive/test/util');

let searchClients;

class FakeSearchClient extends EventEmitter {
  constructor(searchFn, opts) {
    super();

    assert.ok(searchFn);
    searchClients.push(this);
    this.cancel = sinon.stub();
    this.incremental = !!opts.incremental;

    this.get = sinon.spy(function(query) {
      assert.ok(query.uri);

      for (let i = 0; i < query.uri.length; i++) {
        const uri = query.uri[i];
        this.emit('results', [{ id: uri + '123', group: '__world__' }]);
        this.emit('results', [{ id: uri + '456', group: 'private-group' }]);
      }

      this.emit('end');
    });
  }
}

class FakeRootThread extends EventEmitter {
  constructor() {
    super();
    this.thread = sinon.stub().returns({
      totalChildren: 0,
    });
  }
}

describe('sidebar.components.sidebar-content', function() {
  let $rootScope;
  let $scope;
  let store;
  let ctrl;
  let fakeAnalytics;
  let fakeAnnotationMapper;
  let fakeDrafts;
  let fakeFeatures;
  let fakeFrameSync;
  let fakeGroups;
  let fakeRootThread;
  let fakeSettings;
  let fakeApi;
  let fakeStreamer;
  let fakeStreamFilter;
  let sandbox;

  before(function() {
    angular
      .module('h', [])
      .service('store', require('../../store'))
      .component('sidebarContent', sidebarContent);
  });

  beforeEach(angular.mock.module('h'));

  beforeEach(() => {
    angular.mock.module(function($provide) {
      searchClients = [];
      sandbox = sinon.sandbox.create();

      fakeAnalytics = {
        track: sandbox.stub(),
        events: {},
      };

      fakeAnnotationMapper = {
        loadAnnotations: sandbox.stub(),
        unloadAnnotations: sandbox.stub(),
      };

      fakeFrameSync = {
        focusAnnotations: sinon.stub(),
        scrollToAnnotation: sinon.stub(),
      };

      fakeDrafts = {
        unsaved: sandbox.stub().returns([]),
      };

      fakeFeatures = {
        flagEnabled: sandbox.stub().returns(true),
      };

      fakeStreamer = {
        setConfig: sandbox.stub(),
        connect: sandbox.stub(),
        reconnect: sandbox.stub(),
      };

      fakeStreamFilter = {
        resetFilter: sandbox.stub().returnsThis(),
        addClause: sandbox.stub().returnsThis(),
        getFilter: sandbox.stub().returns({}),
      };

      fakeGroups = {
        focused: sinon.stub().returns({ id: 'foo' }),
        focus: sinon.stub(),
      };

      fakeRootThread = new FakeRootThread();

      fakeSettings = {};

      fakeApi = {
        search: sinon.stub(),
      };

      $provide.value('analytics', fakeAnalytics);
      $provide.value('annotationMapper', fakeAnnotationMapper);
      $provide.value('api', fakeApi);
      $provide.value('drafts', fakeDrafts);
      $provide.value('features', fakeFeatures);
      $provide.value('frameSync', fakeFrameSync);
      $provide.value('rootThread', fakeRootThread);
      $provide.value('streamer', fakeStreamer);
      $provide.value('streamFilter', fakeStreamFilter);
      $provide.value('groups', fakeGroups);
      $provide.value('settings', fakeSettings);
    });

    sidebarContent.$imports.$mock({
      '../search-client': FakeSearchClient,
    });
  });

  afterEach(() => {
    sidebarContent.$imports.$restore();
  });

  function setFrames(frames) {
    frames.forEach(function(frame) {
      store.connectFrame(frame);
    });
  }

  function createSidebarContent(
    { userid } = { userid: 'acct:person@example.com' }
  ) {
    return util.createDirective(document, 'sidebarContent', {
      auth: {
        status: userid ? 'logged-in' : 'logged-out',
        userid: userid,
      },
      search: sinon.stub().returns({ query: sinon.stub() }),
      onLogin: sinon.stub(),
    });
  }

  const makeSidebarContentController = () => {
    angular.mock.inject(function($componentController, _store_, _$rootScope_) {
      $rootScope = _$rootScope_;
      $scope = $rootScope.$new();
      store = _store_;
      store.updateFrameAnnotationFetchStatus = sinon.stub();
      ctrl = $componentController(
        'sidebarContent',
        { $scope: $scope },
        {
          auth: { status: 'unknown' },
        }
      );
    });
  };

  beforeEach(() => {
    makeSidebarContentController();
  });

  afterEach(function() {
    return sandbox.restore();
  });

  describe('showSelectedTabs', () => {
    beforeEach(() => {
      setFrames([{ uri: 'http://www.example.com' }]);
    });

    it('returns false if there is a search query', () => {
      store.setFilterQuery('tag:foo');
      assert.isFalse(ctrl.showSelectedTabs());
    });

    it('returns false if selected group is unavailable', () => {
      fakeSettings.group = 'group-id';
      store.setDirectLinkedGroupFetchFailed();
      $scope.$digest();
      assert.isFalse(ctrl.showSelectedTabs());
    });

    it('returns false if selected annotation is unavailable', () => {
      store.selectAnnotations(['missing']);
      $scope.$digest();
      assert.isFalse(ctrl.showSelectedTabs());
    });

    it('returns true in all other cases', () => {
      assert.isTrue(ctrl.showSelectedTabs());
    });
  });

  describe('#loadAnnotations', function() {
    it('unloads any existing annotations', function() {
      // When new clients connect, all existing annotations should be unloaded
      // before reloading annotations for each currently-connected client
      store.addAnnotations([{ id: '123' }]);
      const uri1 = 'http://example.com/page-a';
      let frames = [{ uri: uri1 }];
      setFrames(frames);
      $scope.$digest();
      fakeAnnotationMapper.unloadAnnotations = sandbox.spy();
      const uri2 = 'http://example.com/page-b';
      frames = frames.concat({ uri: uri2 });
      setFrames(frames);
      $scope.$digest();
      assert.calledWith(
        fakeAnnotationMapper.unloadAnnotations,
        store.getState().annotations
      );
    });

    it('loads all annotations for a frame', function() {
      const uri = 'http://example.com';
      setFrames([{ uri: uri }]);
      $scope.$digest();
      const loadSpy = fakeAnnotationMapper.loadAnnotations;
      assert.calledWith(loadSpy, [sinon.match({ id: uri + '123' })]);
      assert.calledWith(loadSpy, [sinon.match({ id: uri + '456' })]);
    });

    it('loads all annotations for a frame with multiple urls', function() {
      const uri = 'http://example.com/test.pdf';
      const fingerprint = 'urn:x-pdf:fingerprint';
      setFrames([
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
      $scope.$digest();
      const loadSpy = fakeAnnotationMapper.loadAnnotations;

      assert.calledWith(loadSpy, [sinon.match({ id: uri + '123' })]);
      assert.calledWith(loadSpy, [sinon.match({ id: fingerprint + '123' })]);
      assert.calledWith(loadSpy, [sinon.match({ id: uri + '456' })]);
      assert.calledWith(loadSpy, [sinon.match({ id: fingerprint + '456' })]);
    });

    it('loads all annotations for all frames', function() {
      const uris = ['http://example.com', 'http://foobar.com'];
      setFrames(
        uris.map(function(uri) {
          return { uri: uri };
        })
      );
      $scope.$digest();
      const loadSpy = fakeAnnotationMapper.loadAnnotations;
      assert.calledWith(loadSpy, [sinon.match({ id: uris[0] + '123' })]);
      assert.calledWith(loadSpy, [sinon.match({ id: uris[0] + '456' })]);
      assert.calledWith(loadSpy, [sinon.match({ id: uris[1] + '123' })]);
      assert.calledWith(loadSpy, [sinon.match({ id: uris[1] + '456' })]);
    });

    it('updates annotation fetch status for all frames', function() {
      const frameUris = ['http://example.com', 'http://foobar.com'];
      setFrames(
        frameUris.map(function(frameUri) {
          return { uri: frameUri };
        })
      );
      $scope.$digest();
      const updateSpy = store.updateFrameAnnotationFetchStatus;
      assert.isTrue(updateSpy.calledWith(frameUris[0], true));
      assert.isTrue(updateSpy.calledWith(frameUris[1], true));
    });

    context('when there is a direct-linked group error', () => {
      beforeEach(() => {
        setFrames([{ uri: 'http://www.example.com' }]);
        fakeSettings.group = 'group-id';
        store.setDirectLinkedGroupFetchFailed();
        $scope.$digest();
      });

      [null, 'acct:person@example.com'].forEach(userid => {
        it('displays same group error message regardless of login state', () => {
          const element = createSidebarContent({ userid });

          const sidebarContentError = element.find('.sidebar-content-error');
          const errorMessage = sidebarContentError.attr(
            'logged-in-error-message'
          );

          assert.equal(errorMessage, "'This group is not available.'");
        });
      });

      it('selectedGroupUnavailable returns true', () => {
        assert.isTrue(ctrl.selectedGroupUnavailable());
      });
    });

    context('when there is a direct-linked group selection', () => {
      beforeEach(() => {
        setFrames([{ uri: 'http://www.example.com' }]);
        fakeSettings.group = 'group-id';
        store.loadGroups([{ id: fakeSettings.group }]);
        store.focusGroup(fakeSettings.group);
        fakeGroups.focused.returns({ id: fakeSettings.group });
        $scope.$digest();
      });

      it('selectedGroupUnavailable returns false', () => {
        assert.isFalse(ctrl.selectedGroupUnavailable());
      });

      it('fetches annotations for the direct-linked group', () => {
        assert.calledWith(searchClients[0].get, {
          uri: ['http://www.example.com'],
          group: 'group-id',
        });
      });
    });

    context('when there is a direct-linked annotation selection', function() {
      const uri = 'http://example.com';
      const id = uri + '123';

      beforeEach(function() {
        setFrames([{ uri: uri }]);
        store.selectAnnotations([id]);
        $scope.$digest();
      });

      it("switches to the selected annotation's group", function() {
        assert.calledWith(fakeGroups.focus, '__world__');
        assert.calledOnce(fakeAnnotationMapper.loadAnnotations);
        assert.calledWith(fakeAnnotationMapper.loadAnnotations, [
          { id: uri + '123', group: '__world__' },
        ]);
      });

      it('fetches annotations for all groups', function() {
        assert.calledWith(searchClients[0].get, { uri: [uri], group: null });
      });

      it('loads annotations in one batch', function() {
        assert.notOk(searchClients[0].incremental);
      });
    });

    context('when there is no selection', function() {
      const uri = 'http://example.com';

      beforeEach(function() {
        setFrames([{ uri: uri }]);
        fakeGroups.focused.returns({ id: 'a-group' });
        $scope.$digest();
      });

      it('fetches annotations for the current group', function() {
        assert.calledWith(searchClients[0].get, {
          uri: [uri],
          group: 'a-group',
        });
      });

      it('loads annotations in batches', function() {
        assert.ok(searchClients[0].incremental);
      });
    });

    context('when the selected annotation is not available', function() {
      const uri = 'http://example.com';
      const id = uri + 'does-not-exist';

      beforeEach(function() {
        setFrames([{ uri: uri }]);
        store.selectAnnotations([id]);
        fakeGroups.focused.returns({ id: 'private-group' });
        $scope.$digest();
      });

      it('loads annotations from the focused group instead', function() {
        assert.calledWith(fakeGroups.focus, 'private-group');
        assert.calledWith(fakeAnnotationMapper.loadAnnotations, [
          { group: 'private-group', id: 'http://example.com456' },
        ]);
      });
    });
  });

  function connectFrameAndPerformInitialFetch() {
    setFrames([{ uri: 'https://a-page.com' }]);
    $scope.$digest();
    fakeAnnotationMapper.loadAnnotations.reset();
  }

  context('when the search URIs of connected frames change', () => {
    beforeEach(connectFrameAndPerformInitialFetch);

    it('reloads annotations', () => {
      setFrames([{ uri: 'https://new-frame.com' }]);

      $scope.$digest();

      assert.called(fakeAnnotationMapper.loadAnnotations);
    });
  });

  context('when the profile changes', () => {
    beforeEach(connectFrameAndPerformInitialFetch);

    it('reloads annotations if the user ID changed', () => {
      const newProfile = Object.assign({}, store.profile(), {
        userid: 'different-user@hypothes.is',
      });

      store.updateSession(newProfile);
      $scope.$digest();

      assert.called(fakeAnnotationMapper.loadAnnotations);
    });

    it('does not reload annotations if the user ID is the same', () => {
      const newProfile = Object.assign({}, store.profile(), {
        user_info: {
          display_name: 'New display name',
        },
      });

      store.updateSession(newProfile);
      $scope.$digest();

      assert.notCalled(fakeAnnotationMapper.loadAnnotations);
    });
  });

  describe('when an annotation is anchored', function() {
    it('focuses and scrolls to the annotation if already selected', function() {
      const uri = 'http://example.com';
      store.selectAnnotations(['123']);
      setFrames([{ uri: uri }]);
      const annot = {
        $tag: 'atag',
        id: '123',
      };
      store.addAnnotations([annot]);
      $scope.$digest();
      $rootScope.$broadcast(events.ANNOTATIONS_SYNCED, ['atag']);
      assert.calledWith(fakeFrameSync.focusAnnotations, ['atag']);
      assert.calledWith(fakeFrameSync.scrollToAnnotation, 'atag');
    });
  });

  describe('when the focused group changes', () => {
    const uri = 'http://example.com';

    beforeEach(() => {
      // Setup an initial state with frames connected, a group focused and some
      // annotations loaded.
      store.addAnnotations([{ id: '123' }]);
      store.addAnnotations = sinon.stub();
      fakeDrafts.unsaved.returns([{ id: uri + '123' }, { id: uri + '456' }]);
      setFrames([{ uri: uri }]);
      $scope.$digest();
    });

    function changeGroup() {
      fakeGroups.focused.returns({ id: 'different-group' });
      $scope.$digest();
    }

    it('should load annotations for the new group', () => {
      const loadSpy = fakeAnnotationMapper.loadAnnotations;

      changeGroup();

      assert.calledWith(fakeAnnotationMapper.unloadAnnotations, [
        sinon.match({ id: '123' }),
      ]);
      $scope.$digest();
      assert.calledWith(loadSpy, [sinon.match({ id: uri + '123' })]);
      assert.calledWith(loadSpy, [sinon.match({ id: uri + '456' })]);
    });

    it('should clear the selection', () => {
      store.selectAnnotations(['123']);

      changeGroup();

      assert.isFalse(store.hasSelectedAnnotations());
    });
  });

  describe('direct linking messages', function() {
    /**
     * Connect a frame, indicating that the document has finished initial
     * loading.
     *
     * In the case of an HTML document, this usually happens immediately. For
     * PDFs, this happens once the entire PDF has been downloaded and the
     * document's metadata has been read.
     */
    function addFrame() {
      setFrames([
        {
          uri: 'http://www.example.com',
        },
      ]);
    }

    beforeEach(function() {
      store.setDirectLinkedAnnotationId('test');
    });

    it('displays a message if the selection is unavailable', function() {
      addFrame();
      store.selectAnnotations(['missing']);
      $scope.$digest();
      assert.isTrue(ctrl.selectedAnnotationUnavailable());
    });

    it('does not show a message if the selection is available', function() {
      addFrame();
      store.addAnnotations([{ id: '123' }]);
      store.selectAnnotations(['123']);
      $scope.$digest();
      assert.isFalse(ctrl.selectedAnnotationUnavailable());
    });

    it('does not a show a message if there is no selection', function() {
      addFrame();
      store.selectAnnotations([]);
      $scope.$digest();
      assert.isFalse(ctrl.selectedAnnotationUnavailable());
    });

    it("doesn't show a message if the document isn't loaded yet", function() {
      // No search requests have been sent yet.
      searchClients = [];
      // There is a selection but the selected annotation isn't available.
      store.selectAnnotations(['missing']);
      $scope.$digest();

      assert.isFalse(ctrl.selectedAnnotationUnavailable());
    });

    it('shows logged out message if selection is available', function() {
      addFrame();
      ctrl.auth = {
        status: 'logged-out',
      };
      store.addAnnotations([{ id: '123' }]);
      store.selectAnnotations(['123']);
      $scope.$digest();
      assert.isTrue(ctrl.shouldShowLoggedOutMessage());
    });

    it('does not show loggedout message if selection is unavailable', function() {
      addFrame();
      ctrl.auth = {
        status: 'logged-out',
      };
      store.selectAnnotations(['missing']);
      $scope.$digest();
      assert.isFalse(ctrl.shouldShowLoggedOutMessage());
    });

    it('does not show loggedout message if there is no selection', function() {
      addFrame();
      ctrl.auth = {
        status: 'logged-out',
      };
      store.selectAnnotations([]);
      $scope.$digest();
      assert.isFalse(ctrl.shouldShowLoggedOutMessage());
    });

    it('does not show loggedout message if user is not logged out', function() {
      addFrame();
      ctrl.auth = {
        status: 'logged-in',
      };
      store.addAnnotations([{ id: '123' }]);
      store.selectAnnotations(['123']);
      $scope.$digest();
      assert.isFalse(ctrl.shouldShowLoggedOutMessage());
    });

    it('does not show loggedout message if not a direct link', function() {
      addFrame();
      ctrl.auth = {
        status: 'logged-out',
      };
      store.setDirectLinkedAnnotationId(null);
      store.addAnnotations([{ id: '123' }]);
      store.selectAnnotations(['123']);
      $scope.$digest();
      assert.isFalse(ctrl.shouldShowLoggedOutMessage());
    });

    it('does not show loggedout message if using third-party accounts', function() {
      fakeSettings.services = [{ authority: 'publisher.com' }];
      addFrame();
      ctrl.auth = { status: 'logged-out' };
      store.addAnnotations([{ id: '123' }]);
      store.selectAnnotations(['123']);
      $scope.$digest();

      assert.isFalse(ctrl.shouldShowLoggedOutMessage());
    });
  });

  describe('deferred websocket connection', function() {
    it('should connect the websocket the first time the sidebar opens', function() {
      $rootScope.$broadcast('sidebarOpened');
      assert.called(fakeStreamer.connect);
    });

    describe('when logged in user changes', function() {
      it('should not reconnect if the sidebar is closed', function() {
        $rootScope.$broadcast(events.USER_CHANGED);
        assert.calledOnce(fakeStreamer.reconnect);
      });

      it('should reconnect if the sidebar is open', function() {
        $rootScope.$broadcast('sidebarOpened');
        fakeStreamer.connect.reset();
        $rootScope.$broadcast(events.USER_CHANGED);
        assert.called(fakeStreamer.reconnect);
      });
    });
  });
});
