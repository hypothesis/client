'use strict';

const angular = require('angular');
const EventEmitter = require('tiny-emitter');

const events = require('../../events');
const sidebarContent = require('../sidebar-content');

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
  let fakeAnnotations;
  let fakeFrameSync;
  let fakeRootThread;
  let fakeSettings;
  let fakeStreamer;
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
      sandbox = sinon.sandbox.create();

      fakeAnalytics = {
        track: sandbox.stub(),
        events: {},
      };

      fakeFrameSync = {
        focusAnnotations: sinon.stub(),
        scrollToAnnotation: sinon.stub(),
      };

      fakeStreamer = {
        setConfig: sandbox.stub(),
        connect: sandbox.stub(),
        reconnect: sandbox.stub(),
      };

      fakeAnnotations = {
        load: sinon.stub(),
      };

      fakeRootThread = new FakeRootThread();

      fakeSettings = {};

      $provide.value('analytics', fakeAnalytics);
      $provide.value('frameSync', fakeFrameSync);
      $provide.value('rootThread', fakeRootThread);
      $provide.value('streamer', fakeStreamer);
      $provide.value('annotations', fakeAnnotations);
      $provide.value('settings', fakeSettings);
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

  const makeSidebarContentController = () => {
    angular.mock.inject(function($componentController, _store_, _$rootScope_) {
      $rootScope = _$rootScope_;
      $scope = $rootScope.$new();

      store = _store_;
      store.updateFrameAnnotationFetchStatus = sinon.stub();
      store.clearGroups();
      store.loadGroups([{ id: 'group-id' }]);
      store.focusGroup('group-id');

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

  describe('isLoading', () => {
    it("returns true if the document's url isn't known", () => {
      assert.isTrue(ctrl.isLoading());
    });

    it('returns true if annotations are still being fetched', () => {
      setFrames([{ uri: 'http://www.example.com' }]);
      store.annotationFetchStarted('tag:foo');
      assert.isTrue(ctrl.isLoading());
    });

    it('returns false if annotations have been fetched', () => {
      setFrames([{ uri: 'http://www.example.com' }]);
      assert.isFalse(ctrl.isLoading());
    });
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

  describe('showFocusedHeader', () => {
    it('returns true if focus mode is enabled', () => {
      store.focusModeEnabled = sinon.stub().returns(true);
      assert.isTrue(ctrl.showFocusedHeader());
    });
    it('returns false if focus mode is not enabled', () => {
      store.focusModeEnabled = sinon.stub().returns(false);
      assert.isFalse(ctrl.showFocusedHeader());
    });
  });

  function connectFrameAndPerformInitialFetch() {
    setFrames([{ uri: 'https://a-page.com' }]);
    $scope.$digest();
    fakeAnnotations.load.reset();
  }

  it('generates the thread list', () => {
    const thread = fakeRootThread.thread(store.getState());
    assert.equal(ctrl.rootThread(), thread);
  });

  context('when the search URIs of connected frames change', () => {
    beforeEach(connectFrameAndPerformInitialFetch);

    it('reloads annotations', () => {
      setFrames([{ uri: 'https://new-frame.com' }]);

      $scope.$digest();

      assert.calledWith(
        fakeAnnotations.load,
        ['https://a-page.com', 'https://new-frame.com'],
        'group-id'
      );
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

      assert.calledWith(
        fakeAnnotations.load,
        ['https://a-page.com'],
        'group-id'
      );
    });

    it('does not reload annotations if the user ID is the same', () => {
      const newProfile = Object.assign({}, store.profile(), {
        user_info: {
          display_name: 'New display name',
        },
      });

      store.updateSession(newProfile);
      $scope.$digest();

      assert.notCalled(fakeAnnotations.load);
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
      setFrames([{ uri: uri }]);
      $scope.$digest();
      fakeAnnotations.load = sinon.stub();
    });

    it('should load annotations for the new group', () => {
      store.loadGroups([{ id: 'different-group' }]);
      store.focusGroup('different-group');

      $scope.$digest();

      assert.calledWith(
        fakeAnnotations.load,
        ['http://example.com'],
        'different-group'
      );
    });

    it('should clear the selection', () => {
      store.selectAnnotations(['123']);
      store.loadGroups([{ id: 'different-group' }]);
      store.focusGroup('different-group');

      $scope.$digest();

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
      // There is a selection but the selected annotation isn't available.
      store.selectAnnotations(['missing']);
      store.annotationFetchStarted();
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
