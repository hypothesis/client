import EventEmitter from 'tiny-emitter';

import { Injector } from '../../../shared/injector';
import * as annotationFixtures from '../../test/annotation-fixtures';
import { fakeReduxStore } from '../../test/fake-redux-store';
import { delay } from '../../../test-util/wait';

import { FrameSyncService, $imports, formatAnnot } from '../frame-sync';

class FakeWindow extends EventTarget {
  constructor() {
    super();
    this.postMessage = sinon.stub();
  }
}

const testAnnotation = annotationFixtures.defaultAnnotation();

const fixtures = {
  ann: { $tag: 't1', ...testAnnotation },

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
    uri: testAnnotation.uri,
    metadata: {
      link: [],
    },

    // This should match the guest frame ID from `framesListEntry`.
    frameIdentifier: 'abc',
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

    fakeStore = fakeReduxStore(
      { annotations: [], frames: [], profile: { features: {} } },
      {
        allAnnotations() {
          return this.getState().annotations;
        },

        connectFrame(frame) {
          const frames = [
            ...this.getState().frames,
            {
              ...frame,
              isAnnotationFetchComplete: true,
            },
          ];
          this.setState({ frames });
        },

        destroyFrame(frame) {
          const frames = this.getState().frames;
          this.setState({ frames: frames.filter(f => f.id !== frame.id) });
        },

        frames() {
          return this.getState().frames;
        },

        profile() {
          return this.getState().profile;
        },

        findIDsForTags: sinon.stub(),
        focusAnnotations: sinon.stub(),
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
        requestId: 'abc',
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
      const frameInfo = fixtures.htmlDocumentInfo;
      await connectGuest();
      emitGuestEvent('documentInfoChanged', frameInfo);

      fakeStore.setState({
        annotations: [fixtures.ann],
      });

      assert.calledWithMatch(
        guestRPC().call,
        'loadAnnotations',
        sinon.match([formatAnnot(fixtures.ann)])
      );
    });

    it('sends annotations only to matching frame', async () => {
      // Annotation whose URI exactly matches the main frame.
      const mainFrameAnn = {
        id: 'abc',
        uri: 'https://example.com',
      };

      // Annotation whose URI exactly matches the iframe.
      const iframeAnn = {
        id: 'def',
        uri: 'https://example.com/iframe',
      };

      // Annotation whose URI doesn't match either frame exactly.
      //
      // The search API can return such annotations if the annotation's URI
      // is deemed equivalent to one of the searched-for URIs.
      const unknownFrameAnn = {
        id: 'ghi',
        uri: 'https://example.org',
      };

      // Connect two guests, one representing the main frame and one representing
      // an iframe.
      await connectGuest();
      await connectGuest();

      const mainGuestRPC = fakePortRPCs[1];
      const iframeGuestRPC = fakePortRPCs[2];

      mainGuestRPC.emit('documentInfoChanged', {
        frameIdentifier: null,
        uri: mainFrameAnn.uri,
      });

      iframeGuestRPC.emit('documentInfoChanged', {
        frameIdentifier: 'iframe',
        uri: iframeAnn.uri,
      });

      fakeStore.setState({
        annotations: [mainFrameAnn, iframeAnn, unknownFrameAnn],
      });

      // Check that expected annotations were sent to each frame.
      assert.calledWithMatch(
        mainGuestRPC.call,
        'loadAnnotations',
        sinon.match([formatAnnot(mainFrameAnn), formatAnnot(unknownFrameAnn)])
      );
      assert.calledWithMatch(
        iframeGuestRPC.call,
        'loadAnnotations',
        sinon.match([formatAnnot(iframeAnn)])
      );
    });

    it('sends annotation to first frame if there is no frame with matching URL or main frame', async () => {
      const annotation = {
        id: 'abc',
        uri: 'urn:book-id:1234',
      };

      // Connect a single guest which is not the main/host frame. This simulates
      // what happens in VitalSource for example.
      await connectGuest();
      emitGuestEvent('documentInfoChanged', {
        frameIdentifier: 'iframe',

        // Note that URI does not match annotation URI. The backend can still return
        // the annotation for this frame based on URI equivalence information.
        uri: 'https://publisher.com/books/1234/chapter1.html',
      });

      fakeStore.setState({
        annotations: [annotation],
      });

      assert.calledWithMatch(
        guestRPC().call,
        'loadAnnotations',
        sinon.match([formatAnnot(annotation)])
      );
    });

    it('sends a "loadAnnotations" message only for new annotations', async () => {
      const frameInfo = fixtures.htmlDocumentInfo;
      await connectGuest();
      emitGuestEvent('documentInfoChanged', frameInfo);

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

    it('sends a "publicAnnotationCountChanged" message to the frame when there are public annotations', async () => {
      await connectGuest();
      emitGuestEvent('documentInfoChanged', fixtures.htmlDocumentInfo);

      fakeStore.setState({
        annotations: [annotationFixtures.publicAnnotation()],
      });

      assert.calledWithMatch(
        hostRPC().call,
        'publicAnnotationCountChanged',
        sinon.match(1)
      );
    });

    it('sends a "publicAnnotationCountChanged" message to the frame when there are only private annotations', async () => {
      await connectGuest();
      emitGuestEvent('documentInfoChanged', fixtures.htmlDocumentInfo);

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

    it('does not send a "publicAnnotationCountChanged" message to the frame if annotation fetch is not complete', async () => {
      await connectGuest();
      emitGuestEvent('documentInfoChanged', fixtures.htmlDocumentInfo);
      fakeStore.frames()[0].isAnnotationFetchComplete = false;

      // Discard 'publicAnnotationCountChanged' message sent after frame connected.
      hostRPC().call.resetHistory();

      fakeStore.setState({
        annotations: [annotationFixtures.publicAnnotation()],
      });
      assert.isFalse(hostRPC().call.calledWith('publicAnnotationCountChanged'));
    });

    it('does not send a "publicAnnotationCountChanged" message if there are no connected frames', () => {
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

      assert.deepEqual(fakeStore.frames(), [
        {
          id: frameInfo.frameIdentifier,
          metadata: frameInfo.metadata,
          uri: frameInfo.uri,

          // This would be false in the real application initially, but in these
          // tests we pretend that the fetch completed immediately.
          isAnnotationFetchComplete: true,
        },
      ]);
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

      emitGuestEvent('close');

      assert.called(guestRPC().destroy);
    });

    it('removes the guest from the store', async () => {
      frameSync.connect();
      await connectGuest();

      emitGuestEvent('documentInfoChanged', {
        frameIdentifier: 'abc',
        uri: 'http://example.org',
      });
      emitGuestEvent('close');

      assert.deepEqual(fakeStore.frames(), []);
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

  describe('sending feature flags to frames', () => {
    const currentFlags = () => fakeStore.getState().profile.features;
    const setFlags = features => fakeStore.setState({ profile: { features } });

    beforeEach(async () => {
      // Set some initial flags before the host frame is even connected.
      setFlags({ some_flag: true, other_flag: false });

      await frameSync.connect();
    });

    it('sends feature flags to host frame', () => {
      assert.calledWith(hostRPC().call, 'featureFlagsUpdated', currentFlags());
    });

    it('sends feature flags to guest frames when they connect', async () => {
      await connectGuest();
      assert.calledWith(guestRPC().call, 'featureFlagsUpdated', currentFlags());
    });

    it('sends updated feature flags to host and guest frames', async () => {
      await connectGuest();
      hostRPC().call.resetHistory();
      guestRPC().call.resetHistory();

      // Simulate profile update changing feature flags.
      const features = { some_flag: true, other_flag: true };
      setFlags(features);

      assert.calledWith(hostRPC().call, 'featureFlagsUpdated', currentFlags());
      assert.calledWith(guestRPC().call, 'featureFlagsUpdated', currentFlags());
    });
  });
});
