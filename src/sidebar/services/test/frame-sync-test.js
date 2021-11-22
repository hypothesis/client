import EventEmitter from 'tiny-emitter';

import { Injector } from '../../../shared/injector';
import * as annotationFixtures from '../../test/annotation-fixtures';
import createFakeStore from '../../test/fake-redux-store';

import { FrameSyncService, $imports, formatAnnot } from '../frame-sync';

class FakeWindow extends EventTarget {
  constructor() {
    super();
    this.postMessage = sinon.stub();
  }
}

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

describe('FrameSyncService', () => {
  let FakeBridge;

  let fakeAnnotationsService;
  let fakeStore;
  let fakeBridges;
  let frameSync;
  let fakeWindow;

  beforeEach(() => {
    fakeStore = createFakeStore(
      { annotations: [] },
      {
        allAnnotations() {
          return this.getState().annotations;
        },
        connectFrame: sinon.stub(),
        destroyFrame: sinon.stub(),
        findIDsForTags: sinon.stub(),
        focusAnnotations: sinon.stub(),
        frames: sinon.stub().returns([fixtures.framesListEntry]),
        isLoggedIn: sinon.stub().returns(false),
        openSidebarPanel: sinon.stub(),
        selectAnnotations: sinon.stub(),
        selectTab: sinon.stub(),
        setSidebarOpened: sinon.stub(),
        toggleSelectedAnnotations: sinon.stub(),
        updateAnchorStatus: sinon.stub(),
      }
    );

    fakeAnnotationsService = { create: sinon.stub() };

    fakeBridges = [];
    FakeBridge = sinon.stub().callsFake(() => {
      const emitter = new EventEmitter();
      const bridge = {
        call: sinon.stub(),
        createChannel: sinon.stub(),
        emit: emitter.emit.bind(emitter),
        on: emitter.on.bind(emitter),
        onConnect: function (listener) {
          emitter.on('connect', listener);
        },
      };
      fakeBridges.push(bridge);
      return bridge;
    });

    fakeWindow = new FakeWindow();
    fakeWindow.parent = new FakeWindow();

    $imports.$mock({
      '../../shared/bridge': { Bridge: FakeBridge },
    });

    frameSync = new Injector()
      .register('$window', { value: fakeWindow })
      .register('annotationsService', { value: fakeAnnotationsService })
      .register('store', { value: fakeStore })
      .register('frameSync', FrameSyncService)
      .get('frameSync');
  });

  afterEach(() => {
    $imports.$restore();
  });

  // Helpers for getting the channels used for sidebar <-> guest/host communication.
  // These currently rely on knowing the implementation detail of which order
  // the channels are created in.

  function hostBridge() {
    return fakeBridges[0];
  }

  function guestBridge() {
    return fakeBridges[1];
  }

  describe('#connect', () => {
    let testChannel;

    beforeEach(() => {
      testChannel = new MessageChannel();

      sinon.stub(console, 'warn');
      sinon.stub(window, 'MessageChannel');
      window.MessageChannel.returns(testChannel);
    });

    afterEach(() => {
      console.warn.restore();
      window.MessageChannel.restore();
    });

    it('sends `hypothesisSidebarReady` notification to host frame with message port', () => {
      frameSync.connect();

      assert.calledWith(hostBridge().createChannel, testChannel.port1);
      assert.calledWith(
        fakeWindow.parent.postMessage,
        {
          type: 'hypothesisSidebarReady',
        },
        '*',
        [testChannel.port2]
      );
    });

    it('connects to new guests when they are ready', () => {
      const channel = new MessageChannel();

      frameSync.connect();
      fakeWindow.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'hypothesisGuestReady' },
          ports: [channel.port1],
        })
      );

      assert.calledWith(guestBridge().createChannel, channel.port1);
    });

    [
      { data: 'not-an-object' },
      { data: {} },
      { data: { type: 'unknownType' } },
      {
        // No ports provided with message
        data: { type: 'hypothesisGuestReady' },
      },
    ].forEach(messageInit => {
      it('ignores `hypothesisGuestReady` messages that are invalid', () => {
        frameSync.connect();
        fakeWindow.dispatchEvent(new MessageEvent('message', messageInit));
        assert.notCalled(guestBridge().createChannel);
      });
    });
  });

  context('when annotations are loaded into the sidebar', () => {
    beforeEach(() => {
      frameSync.connect();
    });

    it('sends a "loadAnnotations" message to the frame', () => {
      fakeStore.setState({
        annotations: [fixtures.ann],
      });

      assert.calledWithMatch(
        guestBridge().call,
        'loadAnnotations',
        sinon.match([formatAnnot(fixtures.ann)])
      );
    });

    it('sends a "loadAnnotations" message only for new annotations', () => {
      const ann2 = Object.assign({}, fixtures.ann, { $tag: 't2', id: 'a2' });
      fakeStore.setState({
        annotations: [fixtures.ann],
      });
      guestBridge().call.reset();

      fakeStore.setState({
        annotations: [fixtures.ann, ann2],
      });

      assert.calledWithMatch(
        guestBridge().call,
        'loadAnnotations',
        sinon.match([formatAnnot(ann2)])
      );
    });

    it('does not send a "loadAnnotations" message for replies', () => {
      fakeStore.setState({
        annotations: [annotationFixtures.newReply()],
      });

      assert.isFalse(guestBridge().call.calledWith('loadAnnotations'));
    });
  });

  context('when annotation count has changed', () => {
    beforeEach(() => {
      frameSync.connect();
    });

    it('sends a "publicAnnotationCountChanged" message to the frame when there are public annotations', () => {
      fakeStore.setState({
        annotations: [annotationFixtures.publicAnnotation()],
      });
      assert.calledWithMatch(
        hostBridge().call,
        'publicAnnotationCountChanged',
        sinon.match(1)
      );
    });

    it('sends a "publicAnnotationCountChanged" message to the frame when there are only private annotations', () => {
      const annot = annotationFixtures.defaultAnnotation();
      delete annot.permissions;

      fakeStore.setState({
        annotations: [annot],
      });

      assert.calledWithMatch(
        hostBridge().call,
        'publicAnnotationCountChanged',
        sinon.match(0)
      );
    });

    it('does not send a "publicAnnotationCountChanged" message to the frame if annotation fetch is not complete', () => {
      fakeStore.frames.returns([{ uri: 'http://example.com' }]);
      fakeStore.setState({
        annotations: [annotationFixtures.publicAnnotation()],
      });
      assert.isFalse(
        hostBridge().call.calledWith('publicAnnotationCountChanged')
      );
    });

    it('does not send a "publicAnnotationCountChanged" message if there are no connected frames', () => {
      fakeStore.frames.returns([]);
      fakeStore.setState({
        annotations: [annotationFixtures.publicAnnotation()],
      });
      assert.isFalse(
        hostBridge().call.calledWith('publicAnnotationCountChanged')
      );
    });
  });

  context('when annotations are removed from the sidebar', () => {
    it('sends a "deleteAnnotation" message to the frame', () => {
      frameSync.connect();
      fakeStore.setState({
        annotations: [fixtures.ann],
      });

      fakeStore.setState({
        annotations: [],
      });

      assert.calledWithMatch(
        guestBridge().call,
        'deleteAnnotation',
        sinon.match(formatAnnot(fixtures.ann))
      );
    });
  });

  context('when a new annotation is created in the frame', () => {
    it('makes the new highlight visible in the frame', () => {
      frameSync.connect();
      fakeStore.isLoggedIn.returns(true);
      const ann = { target: [] };

      guestBridge().emit('createAnnotation', { tag: 't1', msg: ann });

      assert.calledWith(hostBridge().call, 'showHighlights');
    });

    context('when an authenticated user is present', () => {
      it('creates the annotation in the sidebar', () => {
        frameSync.connect();
        fakeStore.isLoggedIn.returns(true);
        const ann = { target: [] };

        guestBridge().emit('createAnnotation', { tag: 't1', msg: ann });

        assert.calledWith(
          fakeAnnotationsService.create,
          sinon.match({
            $tag: 't1',
            target: [],
          })
        );
      });

      it('opens the sidebar ready for the user to edit the draft', () => {
        frameSync.connect();
        fakeStore.isLoggedIn.returns(true);
        const ann = { target: [] };

        guestBridge().emit('createAnnotation', { tag: 't1', msg: ann });

        assert.calledWith(hostBridge().call, 'openSidebar');
      });

      it('does not open the sidebar if the annotation is a highlight', () => {
        frameSync.connect();
        fakeStore.isLoggedIn.returns(true);
        const ann = { $highlight: true, target: [] };

        guestBridge().emit('createAnnotation', { tag: 't1', msg: ann });

        assert.neverCalledWith(hostBridge().call, 'openSidebar');
      });
    });

    context('when no authenticated user is present', () => {
      beforeEach(() => {
        fakeStore.isLoggedIn.returns(false);
        frameSync.connect();
      });

      it('should not create an annotation in the sidebar', () => {
        const ann = { target: [] };

        guestBridge().emit('createAnnotation', { tag: 't1', msg: ann });

        assert.notCalled(fakeAnnotationsService.create);
      });

      it('should open the sidebar', () => {
        const ann = { target: [] };
        guestBridge().emit('createAnnotation', { tag: 't1', msg: ann });

        assert.calledWith(hostBridge().call, 'openSidebar');
      });

      it('should open the login prompt panel', () => {
        const ann = { target: [] };
        guestBridge().emit('createAnnotation', { tag: 't1', msg: ann });

        assert.calledWith(fakeStore.openSidebarPanel, 'loginPrompt');
      });

      it('should send a "deleteAnnotation" message to the frame', () => {
        const ann = { target: [] };
        guestBridge().emit('createAnnotation', { tag: 't1', msg: ann });

        assert.calledWith(guestBridge().call, 'deleteAnnotation');
      });
    });
  });

  context('when anchoring completes', () => {
    let clock = sinon.stub();

    beforeEach(() => {
      clock = sinon.useFakeTimers();
      frameSync.connect();
    });

    afterEach(() => {
      clock.restore();
    });

    function expireDebounceTimeout() {
      // "Wait" for debouncing timeout to expire and pending anchoring status
      // updates to be applied.
      clock.tick(20);
    }

    it('updates the anchoring status for the annotation', () => {
      guestBridge().emit('syncAnchoringStatus', [
        { tag: 't1', msg: { $orphan: false } },
      ]);

      expireDebounceTimeout();

      assert.calledWith(fakeStore.updateAnchorStatus, { t1: 'anchored' });
    });

    it('coalesces multiple "syncAnchoringStatus" messages', () => {
      guestBridge().emit('syncAnchoringStatus', [
        { tag: 't1', msg: { $orphan: false } },
      ]);
      guestBridge().emit('syncAnchoringStatus', [
        { tag: 't2', msg: { $orphan: true } },
      ]);

      expireDebounceTimeout();

      assert.calledWith(fakeStore.updateAnchorStatus, {
        t1: 'anchored',
        t2: 'orphan',
      });
    });
  });

  context('when a new frame connects', () => {
    let frameInfo;
    let fakeChannel;

    beforeEach(() => {
      fakeChannel = {
        call: sinon.spy((name, callback) => {
          if (name === 'getDocumentInfo') {
            callback(null, frameInfo);
          }
        }),
        destroy: sinon.stub(),
      };
      frameSync.connect();
    });

    it("adds the page's metadata to the frames list", () => {
      frameInfo = fixtures.htmlDocumentInfo;

      guestBridge().emit('connect', fakeChannel);

      assert.calledWith(fakeStore.connectFrame, {
        id: frameInfo.frameIdentifier,
        metadata: frameInfo.metadata,
        uri: frameInfo.uri,
      });
    });

    it('closes the channel and does not add frame to store if getting document info fails', () => {
      fakeChannel.call = (name, callback) => {
        if (name === 'getDocumentInfo') {
          callback('Something went wrong');
        }
      };

      guestBridge().emit('connect', fakeChannel);

      assert.called(fakeChannel.destroy);
      assert.notCalled(fakeStore.connectFrame);
    });

    it("synchronizes highlight visibility in the guest with the sidebar's controls", () => {
      hostBridge().emit('setHighlightsVisible', true);
      guestBridge().emit('connect', fakeChannel);
      assert.calledWith(fakeChannel.call, 'setHighlightsVisible', true);

      hostBridge().emit('setHighlightsVisible', false);
      guestBridge().emit('connect', fakeChannel);
      assert.calledWith(fakeChannel.call, 'setHighlightsVisible', false);
    });
  });

  context('when a frame is destroyed', () => {
    const frameId = fixtures.framesListEntry.id;

    it('removes the frame from the frames list', () => {
      frameSync.connect();
      hostBridge().emit('frameDestroyed', frameId);

      assert.calledWith(fakeStore.destroyFrame, fixtures.framesListEntry);
    });
  });

  describe('on "showAnnotations" message', () => {
    it('selects annotations which have an ID', () => {
      frameSync.connect();
      fakeStore.findIDsForTags.returns(['id1', 'id2', 'id3']);
      guestBridge().emit('showAnnotations', ['tag1', 'tag2', 'tag3']);

      assert.calledWith(fakeStore.selectAnnotations, ['id1', 'id2', 'id3']);
      assert.calledWith(fakeStore.selectTab, 'annotation');
    });
  });

  describe('on "focusAnnotations" message', () => {
    it('focuses the annotations', () => {
      frameSync.connect();
      guestBridge().emit('focusAnnotations', ['tag1', 'tag2', 'tag3']);
      assert.calledWith(fakeStore.focusAnnotations, ['tag1', 'tag2', 'tag3']);
    });
  });

  describe('on "toggleAnnotationSelection" message', () => {
    it('toggles the selected state of the annotations', () => {
      frameSync.connect();
      fakeStore.findIDsForTags.returns(['id1', 'id2', 'id3']);
      guestBridge().emit('toggleAnnotationSelection', ['tag1', 'tag2', 'tag3']);
      assert.calledWith(fakeStore.toggleSelectedAnnotations, [
        'id1',
        'id2',
        'id3',
      ]);
    });
  });

  describe('on "sidebarOpened" message', () => {
    it('sets the sidebar open in the store', () => {
      frameSync.connect();
      hostBridge().emit('sidebarOpened');

      assert.calledWith(fakeStore.setSidebarOpened, true);
    });
  });

  describe('relaying messages between host and guest frames', () => {
    beforeEach(() => {
      frameSync.connect();
    });

    it('calls "openSidebar"', () => {
      guestBridge().emit('openSidebar');

      assert.calledWith(hostBridge().call, 'openSidebar');
    });

    it('calls "closeSidebar"', () => {
      guestBridge().emit('closeSidebar');

      assert.calledWith(hostBridge().call, 'closeSidebar');
    });

    it('calls "setHighlightsVisible"', () => {
      hostBridge().emit('setHighlightsVisible');

      assert.calledWith(guestBridge().call, 'setHighlightsVisible');
    });
  });

  describe('#focusAnnotations', () => {
    beforeEach(() => {
      frameSync.connect();
    });

    it('should update the focused annotations in the store', () => {
      frameSync.focusAnnotations(['a1', 'a2']);
      assert.calledWith(
        fakeStore.focusAnnotations,
        sinon.match.array.deepEquals(['a1', 'a2'])
      );
    });

    it('should focus the associated highlights in the guest', () => {
      frameSync.focusAnnotations([1, 2]);
      assert.calledWith(
        guestBridge().call,
        'focusAnnotations',
        sinon.match.array.deepEquals([1, 2])
      );
    });
  });

  describe('#scrollToAnnotation', () => {
    it('should scroll to the annotation in the guest', () => {
      frameSync.connect();
      frameSync.scrollToAnnotation('atag');
      assert.calledWith(guestBridge().call, 'scrollToAnnotation', 'atag');
    });
  });

  describe('#notifyHost', () => {
    it('sends a message to the host frame', () => {
      frameSync.connect();
      frameSync.notifyHost('openNotebook', 'group-id');
      assert.calledWith(hostBridge().call, 'openNotebook', 'group-id');
    });
  });
});
