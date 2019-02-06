'use strict';

const angular = require('angular');
const EventEmitter = require('tiny-emitter');

const annotationFixtures = require('../../test/annotation-fixtures');
const events = require('../../events');
const FrameSync = require('../frame-sync').default;
const createFakeStore = require('../../test/fake-redux-store');
const formatAnnot = require('../frame-sync').formatAnnot;
const uiConstants = require('../../ui-constants');

const fixtures = {
  ann: Object.assign({ $tag: 't1' }, annotationFixtures.defaultAnnotation()),

  // New annotation received from the frame
  newAnnFromFrame: {
    tag: 't1',
    msg: {
      target: [],
    },
  },

  // Response to the `getDocumentInfo` channel message for a frame displaying
  // an HTML document
  htmlDocumentInfo: {
    uri: 'http://example.org',
    metadata: {
      link: [],
    },
    frameIdentifier: null,
  },

  // Response to the `getDocumentInfo` channel message for a frame displaying
  // a PDF
  pdfDocumentInfo: {
    uri: 'http://example.org/paper.pdf',
    metadata: {
      documentFingerprint: '1234',
      link: [{ href: 'http://example.org/paper.pdf' }, { href: 'urn:1234' }],
    },
    frameIdentifier: null,
  },

  // The entry in the list of frames currently connected
  framesListEntry: {
    id: 'abc',
    uri: 'http://example.com',
    isAnnotationFetchComplete: true,
  },
};

describe('sidebar.frame-sync', function() {
  let fakeStore;
  let fakeBridge;
  let frameSync;
  let $rootScope;

  before(function() {
    angular.module('app', []).service('frameSync', FrameSync);
  });

  beforeEach(function() {
    fakeStore = createFakeStore(
      { annotations: [] },
      {
        connectFrame: sinon.stub(),
        destroyFrame: sinon.stub(),
        findIDsForTags: sinon.stub(),
        focusAnnotations: sinon.stub(),
        frames: sinon.stub().returns([fixtures.framesListEntry]),
        selectAnnotations: sinon.stub(),
        selectTab: sinon.stub(),
        toggleSelectedAnnotations: sinon.stub(),
        updateAnchorStatus: sinon.stub(),
      }
    );

    const emitter = new EventEmitter();
    fakeBridge = {
      call: sinon.stub(),
      createChannel: sinon.stub(),
      on: emitter.on.bind(emitter),
      onConnect: function(listener) {
        emitter.on('connect', listener);
      },

      emit: emitter.emit.bind(emitter),
    };

    function FakeDiscovery() {
      this.startDiscovery = sinon.stub();
    }

    angular.mock.module('app', {
      Discovery: FakeDiscovery,
      store: fakeStore,
      bridge: fakeBridge,
    });

    angular.mock.inject(function(_$rootScope_, _frameSync_) {
      $rootScope = _$rootScope_;
      frameSync = _frameSync_;
    });
  });

  beforeEach(function() {
    frameSync.connect();
  });

  context('when annotations are loaded into the sidebar', function() {
    it('sends a "loadAnnotations" message to the frame', function() {
      fakeStore.setState({ annotations: [fixtures.ann] });
      assert.calledWithMatch(
        fakeBridge.call,
        'loadAnnotations',
        sinon.match([formatAnnot(fixtures.ann)])
      );
    });

    it('sends a "loadAnnotations" message only for new annotations', function() {
      const ann2 = Object.assign({}, fixtures.ann, { $tag: 't2', id: 'a2' });
      fakeStore.setState({ annotations: [fixtures.ann] });
      fakeBridge.call.reset();

      fakeStore.setState({ annotations: [fixtures.ann, ann2] });

      assert.calledWithMatch(
        fakeBridge.call,
        'loadAnnotations',
        sinon.match([formatAnnot(ann2)])
      );
    });

    it('does not send a "loadAnnotations" message for replies', function() {
      fakeStore.setState({ annotations: [annotationFixtures.newReply()] });
      assert.isFalse(fakeBridge.call.calledWith('loadAnnotations'));
    });
  });

  context('when annotation count has changed', function() {
    it('sends a "publicAnnotationCountChanged" message to the frame when there are public annotations', function() {
      fakeStore.setState({
        annotations: [annotationFixtures.publicAnnotation()],
      });
      assert.calledWithMatch(
        fakeBridge.call,
        'publicAnnotationCountChanged',
        sinon.match(1)
      );
    });

    it('sends a "publicAnnotationCountChanged" message to the frame when there are only private annotations', function() {
      fakeStore.setState({
        annotations: [annotationFixtures.defaultAnnotation()],
      });
      assert.calledWithMatch(
        fakeBridge.call,
        'publicAnnotationCountChanged',
        sinon.match(0)
      );
    });

    it('does not send a "publicAnnotationCountChanged" message to the frame if annotation fetch is not complete', function() {
      fakeStore.frames.returns([{ uri: 'http://example.com' }]);
      fakeStore.setState({
        annotations: [annotationFixtures.publicAnnotation()],
      });
      assert.isFalse(
        fakeBridge.call.calledWith('publicAnnotationCountChanged')
      );
    });

    it('does not send a "publicAnnotationCountChanged" message if there are no connected frames', function() {
      fakeStore.frames.returns([]);
      fakeStore.setState({
        annotations: [annotationFixtures.publicAnnotation()],
      });
      assert.isFalse(
        fakeBridge.call.calledWith('publicAnnotationCountChanged')
      );
    });
  });

  context('when annotations are removed from the sidebar', function() {
    it('sends a "deleteAnnotation" message to the frame', function() {
      fakeStore.setState({ annotations: [fixtures.ann] });
      fakeStore.setState({ annotations: [] });
      assert.calledWithMatch(
        fakeBridge.call,
        'deleteAnnotation',
        sinon.match(formatAnnot(fixtures.ann))
      );
    });
  });

  context('when a new annotation is created in the frame', function() {
    it('emits a BEFORE_ANNOTATION_CREATED event', function() {
      const onCreated = sinon.stub();
      const ann = { target: [] };
      $rootScope.$on(events.BEFORE_ANNOTATION_CREATED, onCreated);

      fakeBridge.emit('beforeCreateAnnotation', { tag: 't1', msg: ann });

      assert.calledWithMatch(
        onCreated,
        sinon.match.any,
        sinon.match({
          $tag: 't1',
          target: [],
        })
      );
    });
  });

  context('when anchoring completes', function() {
    let clock = sinon.stub();

    beforeEach(() => {
      clock = sinon.useFakeTimers();
    });

    afterEach(() => {
      clock.restore();
    });

    function expireDebounceTimeout() {
      // "Wait" for debouncing timeout to expire and pending anchoring status
      // updates to be applied.
      clock.tick(20);
    }

    it('updates the anchoring status for the annotation', function() {
      fakeBridge.emit('sync', [{ tag: 't1', msg: { $orphan: false } }]);

      expireDebounceTimeout();

      assert.calledWith(fakeStore.updateAnchorStatus, { t1: 'anchored' });
    });

    it('coalesces multiple "sync" messages', () => {
      fakeBridge.emit('sync', [{ tag: 't1', msg: { $orphan: false } }]);
      fakeBridge.emit('sync', [{ tag: 't2', msg: { $orphan: true } }]);

      expireDebounceTimeout();

      assert.calledWith(fakeStore.updateAnchorStatus, {
        t1: 'anchored',
        t2: 'orphan',
      });
    });

    it('emits an ANNOTATIONS_SYNCED event', function() {
      const onSync = sinon.stub();
      $rootScope.$on(events.ANNOTATIONS_SYNCED, onSync);

      fakeBridge.emit('sync', [{ tag: 't1', msg: { $orphan: false } }]);
      expireDebounceTimeout();

      assert.calledWithMatch(onSync, sinon.match.any, sinon.match(['t1']));
    });
  });

  context('when a new frame connects', function() {
    let frameInfo;
    const fakeChannel = {
      call: function(name, callback) {
        callback(null, frameInfo);
      },
    };

    it("adds the page's metadata to the frames list", function() {
      frameInfo = fixtures.htmlDocumentInfo;

      fakeBridge.emit('connect', fakeChannel);

      assert.calledWith(fakeStore.connectFrame, {
        id: frameInfo.frameIdentifier,
        metadata: frameInfo.metadata,
        uri: frameInfo.uri,
      });
    });
  });

  context('when a frame is destroyed', function() {
    const frameId = fixtures.framesListEntry.id;

    it('removes the frame from the frames list', function() {
      fakeBridge.emit('destroyFrame', frameId);

      assert.calledWith(fakeStore.destroyFrame, fixtures.framesListEntry);
    });
  });

  describe('on "showAnnotations" message', function() {
    it('selects annotations which have an ID', function() {
      fakeStore.findIDsForTags.returns(['id1', 'id2', 'id3']);
      fakeBridge.emit('showAnnotations', ['tag1', 'tag2', 'tag3']);

      assert.calledWith(fakeStore.selectAnnotations, ['id1', 'id2', 'id3']);
      assert.calledWith(fakeStore.selectTab, uiConstants.TAB_ANNOTATIONS);
    });
  });

  describe('on "focusAnnotations" message', function() {
    it('focuses the annotations', function() {
      fakeBridge.emit('focusAnnotations', ['tag1', 'tag2', 'tag3']);
      assert.calledWith(fakeStore.focusAnnotations, ['tag1', 'tag2', 'tag3']);
    });
  });

  describe('on "toggleAnnotationSelection" message', function() {
    it('toggles the selected state of the annotations', function() {
      fakeStore.findIDsForTags.returns(['id1', 'id2', 'id3']);
      fakeBridge.emit('toggleAnnotationSelection', ['tag1', 'tag2', 'tag3']);
      assert.calledWith(fakeStore.toggleSelectedAnnotations, [
        'id1',
        'id2',
        'id3',
      ]);
    });
  });

  describe('on "sidebarOpened" message', function() {
    it('broadcasts a sidebarOpened event', function() {
      const onSidebarOpened = sinon.stub();
      $rootScope.$on('sidebarOpened', onSidebarOpened);

      fakeBridge.emit('sidebarOpened');

      assert.called(onSidebarOpened);
    });
  });

  describe('on a relayed bridge call', function() {
    it('calls "showSidebar"', function() {
      fakeBridge.emit('showSidebar');

      assert.calledWith(fakeBridge.call, 'showSidebar');
    });

    it('calls "hideSidebar"', function() {
      fakeBridge.emit('hideSidebar');

      assert.calledWith(fakeBridge.call, 'hideSidebar');
    });

    it('calls "setVisibleHighlights"', function() {
      fakeBridge.emit('setVisibleHighlights');

      assert.calledWith(fakeBridge.call, 'setVisibleHighlights');
    });
  });
});
