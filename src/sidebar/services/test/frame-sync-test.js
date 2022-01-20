import EventEmitter from 'tiny-emitter';

import { Injector } from '../../../shared/injector';
import * as annotationFixtures from '../../test/annotation-fixtures';
import createFakeStore from '../../test/fake-redux-store';
import { delay } from '../../../test-util/wait';

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

  // Argument to the `documentInfoChanged` call made by a guest displaying an HTML
  // document.
  htmlDocumentInfo: {
    uri: 'http://example.org',
    metadata: {
      link: [],
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
  let FakePortRPC;

  let fakeAnnotationsService;
  let fakePortRPCs;
  let fakePortFinder;

  let fakeStore;
  let fakeWindow;

  let frameSync;
  let hostPort;
  let sidebarPort;

  // Hook to prepare new PortRPCs after they are created.
  let setupPortRPC;

  beforeEach(() => {
    fakeAnnotationsService = { create: sinon.stub() };
    fakePortRPCs = [];
    setupPortRPC = null;

    FakePortRPC = sinon.stub().callsFake(() => {
      const emitter = new EventEmitter();
      const rpc = {
        call: sinon.stub(),
        connect: sinon.stub(),
        destroy: sinon.stub(),
        emit: emitter.emit.bind(emitter),
        on: emitter.on.bind(emitter),
      };
      fakePortRPCs.push(rpc);

      setupPortRPC?.(rpc);

      return rpc;
    });

    const { port1, port2 } = new MessageChannel();
    hostPort = port1;
    sidebarPort = port2;
    sidebarPort.start();

    fakePortFinder = {
      destroy: sinon.stub(),
      discover: sinon.stub().resolves(sidebarPort),
    };

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

    fakeWindow = new FakeWindow();
    fakeWindow.parent = new FakeWindow();

    $imports.$mock({
      '../../shared/messaging': {
        PortFinder: sinon.stub().returns(fakePortFinder),
        PortRPC: FakePortRPC,
      },
    });

    frameSync = new Injector()
      .register('$window', { value: fakeWindow })
      .register('annotationsService', { value: fakeAnnotationsService })
      .register('store', { value: fakeStore })
      .register('frameSync', FrameSyncService)
      .get('frameSync');
  });

  afterEach(() => {
    frameSync.destroy();
    $imports.$restore();
  });

  // Helpers for getting the channels used for sidebar <-> guest/host communication.
  // These currently rely on knowing the implementation detail of which order
  // the channels are created in.

  function hostRPC() {
    return fakePortRPCs[0];
  }

  function guestRPC() {
    return fakePortRPCs[1];
  }

  function emitHostEvent(event, ...args) {
    hostRPC().emit(event, ...args);
  }

  function emitGuestEvent(event, ...args) {
    guestRPC().emit(event, ...args);
  }

  /**
   * Simulate a new guest frame connecting to the sidebar.
   *
   * @return {MessagePort} - The port that was sent to the sidebar
   */
  async function connectGuest() {
    const { port1 } = new MessageChannel();
    hostPort.postMessage(
      {
        frame1: 'guest',
        frame2: 'sidebar',
        type: 'offer',
      },
      [port1]
    );
    await delay(0);
    return port1;
  }

  describe('#connect', () => {
    it('discovers and connects to the host frame', async () => {
      await frameSync.connect();

      assert.calledWith(hostRPC().connect, sidebarPort);
    });

    it('notifies the host frame that the sidebar is ready to be displayed', async () => {
      await frameSync.connect();

      assert.calledWith(hostRPC().call, 'ready');
    });

    it('connects to new guests', async () => {
      frameSync.connect();
      const port = await connectGuest();
      assert.calledWith(guestRPC().connect, port);
    });
  });

  context('when annotations are loaded into the sidebar', () => {
    beforeEach(() => {
      frameSync.connect();
    });

    it('sends a "loadAnnotations" message to the frame', async () => {
      await connectGuest();

      fakeStore.setState({
        annotations: [fixtures.ann],
      });

      assert.calledWithMatch(
        guestRPC().call,
        'loadAnnotations',
        sinon.match([formatAnnot(fixtures.ann)])
      );
    });

    it('sends a "loadAnnotations" message only for new annotations', async () => {
      await connectGuest();

      const ann2 = Object.assign({}, fixtures.ann, { $tag: 't2', id: 'a2' });
      fakeStore.setState({
        annotations: [fixtures.ann],
      });
      guestRPC().call.reset();

      fakeStore.setState({
        annotations: [fixtures.ann, ann2],
      });

      assert.calledWithMatch(
        guestRPC().call,
        'loadAnnotations',
        sinon.match([formatAnnot(ann2)])
      );
    });

    it('does not send a "loadAnnotations" message for replies', async () => {
      await connectGuest();

      fakeStore.setState({
        annotations: [annotationFixtures.newReply()],
      });

      assert.isFalse(guestRPC().call.calledWith('loadAnnotations'));
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
        hostRPC().call,
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
        hostRPC().call,
        'publicAnnotationCountChanged',
        sinon.match(0)
      );
    });

    it('does not send a "publicAnnotationCountChanged" message to the frame if annotation fetch is not complete', () => {
      fakeStore.frames.returns([{ uri: 'http://example.com' }]);
      fakeStore.setState({
        annotations: [annotationFixtures.publicAnnotation()],
      });
      assert.isFalse(hostRPC().call.calledWith('publicAnnotationCountChanged'));
    });

    it('does not send a "publicAnnotationCountChanged" message if there are no connected frames', () => {
      fakeStore.frames.returns([]);
      fakeStore.setState({
        annotations: [annotationFixtures.publicAnnotation()],
      });
      assert.isFalse(hostRPC().call.calledWith('publicAnnotationCountChanged'));
    });
  });

  context('when annotations are removed from the sidebar', () => {
    it('sends a "deleteAnnotation" message to the frame', async () => {
      const ann = fixtures.ann;

      frameSync.connect();
      await connectGuest();

      fakeStore.setState({
        annotations: [ann],
      });

      fakeStore.setState({
        annotations: [],
      });

      assert.calledWithMatch(guestRPC().call, 'deleteAnnotation', ann.$tag);
    });
  });

  context('when a new annotation is created in the frame', () => {
    it('makes the new highlight visible in the frame', async () => {
      frameSync.connect();
      await connectGuest();

      fakeStore.isLoggedIn.returns(true);

      emitGuestEvent('createAnnotation', { $tag: 't1', target: [] });

      assert.calledWith(hostRPC().call, 'showHighlights');
    });

    context('when an authenticated user is present', () => {
      beforeEach(async () => {
        frameSync.connect();
        await connectGuest();
      });

      it('creates the annotation in the sidebar', async () => {
        fakeStore.isLoggedIn.returns(true);
        const ann = { $tag: 't1', target: [] };

        emitGuestEvent('createAnnotation', ann);

        assert.calledWith(fakeAnnotationsService.create, ann);
      });

      it('opens the sidebar ready for the user to edit the draft', async () => {
        fakeStore.isLoggedIn.returns(true);

        emitGuestEvent('createAnnotation', { $tag: 't1', target: [] });

        assert.calledWith(hostRPC().call, 'openSidebar');
      });

      it('does not open the sidebar if the annotation is a highlight', () => {
        fakeStore.isLoggedIn.returns(true);

        emitGuestEvent('createAnnotation', {
          $tag: 't1',
          $highlight: true,
          target: [],
        });

        assert.neverCalledWith(hostRPC().call, 'openSidebar');
      });
    });

    context('when no authenticated user is present', () => {
      beforeEach(async () => {
        fakeStore.isLoggedIn.returns(false);
        frameSync.connect();
        await connectGuest();
      });

      it('should not create an annotation in the sidebar', () => {
        emitGuestEvent('createAnnotation', { $tag: 't1', target: [] });

        assert.notCalled(fakeAnnotationsService.create);
      });

      it('should open the sidebar', () => {
        emitGuestEvent('createAnnotation', { $tag: 't1', target: [] });

        assert.calledWith(hostRPC().call, 'openSidebar');
      });

      it('should open the login prompt panel', () => {
        emitGuestEvent('createAnnotation', { $tag: 't1', target: [] });

        assert.calledWith(fakeStore.openSidebarPanel, 'loginPrompt');
      });

      it('should send a "deleteAnnotation" message to the frame', () => {
        emitGuestEvent('createAnnotation', { $tag: 't1', target: [] });

        assert.calledWith(guestRPC().call, 'deleteAnnotation');
      });
    });
  });

  context('when anchoring completes', () => {
    let clock = sinon.stub();

    beforeEach(async () => {
      frameSync.connect();
      await connectGuest();

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

    it('updates the anchoring status for the annotation', () => {
      emitGuestEvent('syncAnchoringStatus', { $tag: 't1', $orphan: false });

      expireDebounceTimeout();

      assert.calledWith(fakeStore.updateAnchorStatus, { t1: 'anchored' });
    });

    it('coalesces multiple "syncAnchoringStatus" messages', () => {
      emitGuestEvent('syncAnchoringStatus', {
        $tag: 't1',
        $orphan: false,
      });
      emitGuestEvent('syncAnchoringStatus', {
        $tag: 't2',
        $orphan: true,
      });

      expireDebounceTimeout();

      assert.calledWith(fakeStore.updateAnchorStatus, {
        t1: 'anchored',
        t2: 'orphan',
      });
    });
  });

  context('when a new guest frame connects', () => {
    beforeEach(() => {
      frameSync.connect();
    });

    it("adds the page's metadata to the frames list", async () => {
      const frameInfo = fixtures.htmlDocumentInfo;
      await connectGuest();
      emitGuestEvent('documentInfoChanged', frameInfo);

      assert.calledWith(fakeStore.connectFrame, {
        id: frameInfo.frameIdentifier,
        metadata: frameInfo.metadata,
        uri: frameInfo.uri,
      });
    });

    it("synchronizes highlight visibility in the guest with the sidebar's controls", async () => {
      let channel;
      setupPortRPC = rpc => {
        channel = rpc;
      };

      emitHostEvent('setHighlightsVisible', true);
      await connectGuest();
      assert.calledWith(channel.call, 'setHighlightsVisible', true);

      emitHostEvent('setHighlightsVisible', false);
      await connectGuest();
      assert.calledWith(channel.call, 'setHighlightsVisible', false);
    });
  });

  context('when a guest frame is destroyed', () => {
    it('disconnects the guest', async () => {
      frameSync.connect();
      await connectGuest();

      emitGuestEvent('frameDestroyed');

      assert.called(guestRPC().destroy);
    });

    it('removes the guest from the store', async () => {
      frameSync.connect();
      await connectGuest();

      emitGuestEvent('documentInfoChanged', {
        frameIdentifier: fixtures.framesListEntry.id,
        uri: 'http://example.org',
      });
      emitGuestEvent('frameDestroyed');

      assert.calledWith(fakeStore.destroyFrame, fixtures.framesListEntry);
    });
  });

  describe('on "showAnnotations" message', () => {
    beforeEach(async () => {
      frameSync.connect();
      await connectGuest();
    });

    it('selects annotations which have an ID', () => {
      fakeStore.findIDsForTags.returns(['id1', 'id2', 'id3']);
      emitGuestEvent('showAnnotations', ['tag1', 'tag2', 'tag3']);

      assert.calledWith(fakeStore.selectAnnotations, ['id1', 'id2', 'id3']);
      assert.calledWith(fakeStore.selectTab, 'annotation');
    });
  });

  describe('on "focusAnnotations" message', () => {
    beforeEach(async () => {
      frameSync.connect();
      await connectGuest();
    });

    it('focuses the annotations', () => {
      frameSync.connect();
      emitGuestEvent('focusAnnotations', ['tag1', 'tag2', 'tag3']);
      assert.calledWith(fakeStore.focusAnnotations, ['tag1', 'tag2', 'tag3']);
    });
  });

  describe('on "toggleAnnotationSelection" message', () => {
    beforeEach(async () => {
      frameSync.connect();
      await connectGuest();
    });

    it('toggles the selected state of the annotations', () => {
      frameSync.connect();
      fakeStore.findIDsForTags.returns(['id1', 'id2', 'id3']);
      emitGuestEvent('toggleAnnotationSelection', ['tag1', 'tag2', 'tag3']);
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
      emitHostEvent('sidebarOpened');

      assert.calledWith(fakeStore.setSidebarOpened, true);
    });
  });

  describe('relaying messages between host and guest frames', () => {
    beforeEach(async () => {
      frameSync.connect();
      await connectGuest();
    });

    it('calls "openSidebar"', () => {
      emitGuestEvent('openSidebar');

      assert.calledWith(hostRPC().call, 'openSidebar');
    });

    it('calls "closeSidebar"', () => {
      emitGuestEvent('closeSidebar');

      assert.calledWith(hostRPC().call, 'closeSidebar');
    });

    it('calls "setHighlightsVisible"', () => {
      emitHostEvent('setHighlightsVisible');

      assert.calledWith(guestRPC().call, 'setHighlightsVisible');
    });
  });

  describe('#focusAnnotations', () => {
    beforeEach(async () => {
      frameSync.connect();
      await connectGuest();
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
        guestRPC().call,
        'focusAnnotations',
        sinon.match.array.deepEquals([1, 2])
      );
    });
  });

  describe('#scrollToAnnotation', () => {
    beforeEach(async () => {
      frameSync.connect();
      await connectGuest();
    });

    it('should scroll to the annotation in the guest', () => {
      frameSync.connect();
      frameSync.scrollToAnnotation('atag');
      assert.calledWith(guestRPC().call, 'scrollToAnnotation', 'atag');
    });
  });

  describe('#notifyHost', () => {
    it('sends a message to the host frame', () => {
      frameSync.connect();
      frameSync.notifyHost('openNotebook', 'group-id');
      assert.calledWith(hostRPC().call, 'openNotebook', 'group-id');
    });
  });
});
