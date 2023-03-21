import EventEmitter from 'tiny-emitter';

import { Injector } from '../../../shared/injector';
import { delay } from '../../../test-util/wait';
import * as annotationFixtures from '../../test/annotation-fixtures';
import { fakeReduxStore } from '../../test/fake-redux-store';
import { FrameSyncService, $imports, formatAnnot } from '../frame-sync';

class FakeWindow extends EventTarget {
  constructor() {
    super();
    this.postMessage = sinon.stub();
  }
}

const testAnnotation = annotationFixtures.defaultAnnotation();

const fixtures = {
  ann: { $cluster: 'user-annotations', $tag: 't1', ...testAnnotation },

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
    persistent: false,
  },

  // Argument to the `documentInfoChanged` call made by a guest displaying an EPUB
  // document.
  epubDocumentInfo: {
    uri: testAnnotation.uri,
    metadata: {
      title: 'Test book',
    },
    segmentInfo: {
      cfi: '/2',
      url: '/chapters/02.xhtml',
    },
    persistent: true,
  },
};

describe('FrameSyncService', () => {
  let FakePortRPC;

  let fakeAnnotationsService;
  let fakeToastMessenger;
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
    fakeToastMessenger = new EventEmitter();
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
      {
        annotations: [],
        frames: [],
        profile: { features: {} },
        contentInfo: null,
      },
      {
        allAnnotations() {
          return this.getState().annotations;
        },

        connectFrame(frame) {
          const otherFrames = this.getState().frames.filter(
            f => f.id !== frame.id
          );
          const frames = [
            ...otherFrames,
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

        getContentInfo() {
          return this.getState().contentInfo;
        },

        setContentInfo(info) {
          this.setState({ contentInfo: info });
        },

        findIDsForTags: sinon.stub().returns([]),
        hoverAnnotations: sinon.stub(),
        isLoggedIn: sinon.stub().returns(false),
        openSidebarPanel: sinon.stub(),
        selectAnnotations: sinon.stub(),
        selectTab: sinon.stub(),
        setAnnotationFocusRequest: sinon.stub(),
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
      .register('toastMessenger', { value: fakeToastMessenger })
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

  /** Return the `PortRPC` for the index'th guest to connect. */
  function guestRPC(index = 0) {
    return fakePortRPCs[1 + index];
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
   * @param {string} [frameId] - Guest frame ID, or `undefined` for main frame
   * @return {MessagePort} - The port that was sent to the sidebar
   */
  async function connectGuest(frameId) {
    const { port1 } = new MessageChannel();
    hostPort.postMessage(
      {
        frame1: 'guest',
        frame2: 'sidebar',
        type: 'offer',
        requestId: 'abc',
        sourceId: frameId,
      },
      [port1]
    );
    await delay(0);
    return port1;
  }

  /**
   * Create a fake annotation for an EPUB book.
   *
   * @param {string} cfi - Canonical Fragment Identifier indicating which chapter
   *   the annotation relates to
   */
  function createEPUBAnnotation(cfi) {
    return {
      id: 'epub-id-1',
      $tag: 'epub-tag-1',
      target: [
        {
          selector: [
            {
              type: 'EPUBContentSelector',
              cfi,
            },
          ],
        },
      ],
    };
  }

  /**
   * "Wait" for the debouncing timeout for anchoring status updates to expire.
   */
  function expireDebounceTimeout(clock) {
    clock.tick(20);
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

  describe('formatAnnot', () => {
    it('formats annotations with only those properties needed by the annotator', () => {
      assert.hasAllKeys(formatAnnot(fixtures.ann), [
        '$cluster',
        '$tag',
        'target',
        'uri',
      ]);
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
      await connectGuest('iframe');

      const mainGuestRPC = fakePortRPCs[1];
      const iframeGuestRPC = fakePortRPCs[2];

      mainGuestRPC.emit('documentInfoChanged', {
        uri: mainFrameAnn.uri,
      });

      iframeGuestRPC.emit('documentInfoChanged', {
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

    context('in EPUB documents', () => {
      const bookURI = 'https://publisher.com/books/1234';

      const chapter1ann = {
        uri: bookURI,
        target: [
          {
            selector: [
              {
                type: 'EPUBContentSelector',
                cfi: '/2',
                url: '/chapters/01.xhtml',
              },
            ],
          },
        ],
      };

      const chapter2ann = {
        uri: bookURI,
        target: [
          {
            selector: [
              {
                type: 'EPUBContentSelector',
                cfi: '/4',
                url: '/chapters/02.xhtml',
              },
            ],
          },
        ],
      };

      let clock;

      beforeEach(async () => {
        await connectGuest();
        emitGuestEvent('documentInfoChanged', {
          uri: bookURI,
          segmentInfo: {
            cfi: '/4',
            url: '/chapters/02.xhtml',
          },
        });
      });

      afterEach(() => {
        clock?.restore();
      });

      it('sends annotations to frame only if current segment matches frame', () => {
        fakeStore.setState({ annotations: [chapter1ann, chapter2ann] });

        assert.calledWithMatch(
          guestRPC().call,
          'loadAnnotations',
          sinon.match([formatAnnot(chapter2ann)])
        );
      });

      it('"immediately" marks annotations for other document segments as anchored', () => {
        clock = sinon.useFakeTimers();

        fakeStore.setState({ annotations: [chapter1ann, chapter2ann] });
        assert.notCalled(fakeStore.updateAnchorStatus);

        expireDebounceTimeout(clock);

        assert.calledWith(fakeStore.updateAnchorStatus, {
          [chapter1ann.$tag]: 'anchored',
        });
      });
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

    it('updates the anchoring status for the annotation', () => {
      emitGuestEvent('syncAnchoringStatus', { $tag: 't1', $orphan: false });

      expireDebounceTimeout(clock);

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

      expireDebounceTimeout(clock);

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

    [fixtures.htmlDocumentInfo, fixtures.epubDocumentInfo].forEach(
      frameInfo => {
        it('adds guest frame details to the store', async () => {
          const frameId = 'test-frame';

          await connectGuest(frameId);
          emitGuestEvent('documentInfoChanged', frameInfo);

          assert.deepEqual(fakeStore.frames(), [
            {
              id: frameId,
              metadata: frameInfo.metadata,
              uri: frameInfo.uri,
              segment: frameInfo.segmentInfo,
              persistent: frameInfo.persistent,

              // This would be false in the real application initially, but in these
              // tests we pretend that the fetch completed immediately.
              isAnnotationFetchComplete: true,
            },
          ]);
        });
      }
    );

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

    [true, false].forEach(contentInfoAvailable => {
      it('sends content info to guest if available', async () => {
        let channel;
        setupPortRPC = rpc => {
          channel = rpc;
        };
        const contentInfo = { item: { title: 'Some article' } };
        if (contentInfoAvailable) {
          fakeStore.setContentInfo(contentInfo);
        }

        await connectGuest();

        assert.equal(
          channel.call.calledWith('showContentInfo', contentInfo),
          contentInfoAvailable
        );
      });
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
        uri: 'http://example.org',
      });
      emitGuestEvent('close');

      assert.deepEqual(fakeStore.frames(), []);
    });

    // This test simulates what happens when a book chapter navigation occurs
    // when the integration (such as VitalSource) has support for seamless
    // transitions that do not unload annotations in the sidebar.
    it('keeps frame in store if persistent', async () => {
      frameSync.connect();

      // Connect a guest frame which sets the `persistent` hint and a fixed ID.
      await connectGuest('book-content');
      emitGuestEvent('documentInfoChanged', {
        uri: 'http://books.com/123',
        persistent: true,
        segment: {
          cfi: '/2/4',
        },
      });
      const frames = fakeStore.frames();
      assert.equal(frames.length, 1);

      // Load an annotation into this guest.
      fakeStore.setState({
        annotations: [fixtures.ann],
      });

      // Disconnect the guest, simulating a chapter navigation.
      emitGuestEvent('close');

      // Frames and annotations should be retained in the sidebar.
      assert.equal(fakeStore.frames(), frames);

      // Connect a new guest with the same ID and document URL. It should be
      // associated with the existing frame.
      await connectGuest('book-content');
      emitGuestEvent('documentInfoChanged', {
        uri: 'http://books.com/123',
        persistent: true,
        segment: {
          cfi: '/2/6',
        },
      });
      assert.deepEqual(fakeStore.frames(), frames);

      // Check that the already-loaded annotations were sent to the new frame.
      assert.calledWithMatch(
        guestRPC(1).call,
        'loadAnnotations',
        sinon.match([formatAnnot(fixtures.ann)])
      );
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

    it('does not request keyboard focus if `focusFirstInSelection` is false', () => {
      fakeStore.findIDsForTags.returns(['id1', 'id2', 'id3']);
      emitGuestEvent(
        'showAnnotations',
        ['tag1', 'tag2', 'tag3'],
        false /* focus */
      );
      assert.notCalled(fakeStore.setAnnotationFocusRequest);
    });

    it('requests keyboard focus for first annotation in selection', () => {
      fakeStore.findIDsForTags.returns(['id1', 'id2', 'id3']);
      emitGuestEvent(
        'showAnnotations',
        ['tag1', 'tag2', 'tag3'],
        true /* focus */
      );
      assert.calledWith(fakeStore.setAnnotationFocusRequest, 'id1');
    });

    it('does not request keyboard focus if no IDs could be found for annotation', () => {
      // Simulate no IDs being found. This could happen if annotations are not
      // saved or have been deleted since the request was sent.
      fakeStore.findIDsForTags.returns([]);
      emitGuestEvent('showAnnotations', ['tag1'], true /* focus */);
      assert.notCalled(fakeStore.setAnnotationFocusRequest);
    });
  });

  describe('on "hoverAnnotations" message', () => {
    beforeEach(async () => {
      frameSync.connect();
      await connectGuest();
    });

    it('focuses the annotations', () => {
      frameSync.connect();
      emitGuestEvent('hoverAnnotations', ['tag1', 'tag2', 'tag3']);
      assert.calledWith(fakeStore.hoverAnnotations, ['tag1', 'tag2', 'tag3']);
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

  describe('#hoverAnnotation', () => {
    beforeEach(async () => {
      frameSync.connect();
      await connectGuest();
      emitGuestEvent('documentInfoChanged', fixtures.htmlDocumentInfo);
    });

    it('updates the focused annotations in the store', () => {
      frameSync.hoverAnnotation(fixtures.ann);
      assert.calledWith(
        fakeStore.hoverAnnotations,
        sinon.match.array.deepEquals([fixtures.ann.$tag])
      );

      frameSync.hoverAnnotation(null);
      assert.calledWith(fakeStore.hoverAnnotations, []);
    });

    it('focuses the associated highlights in the guest', () => {
      frameSync.hoverAnnotation(fixtures.ann);
      assert.calledWith(
        guestRPC().call,
        'hoverAnnotations',
        sinon.match.array.deepEquals([fixtures.ann.$tag])
      );
    });

    it('clears focused annotations in guest if argument is `null`', () => {
      frameSync.hoverAnnotation(null);
      assert.calledWith(guestRPC().call, 'hoverAnnotations', []);
    });

    it('defers focusing highlights when annotation is in a different EPUB chapter', async () => {
      emitGuestEvent('documentInfoChanged', fixtures.epubDocumentInfo);

      // Create an annotation with a CFI that doesn't match `fixtures.epubDocumentInfo`.
      const ann = createEPUBAnnotation('/4/8');

      // Request hover of annotation. The annotation is marked as hovered in
      // the sidebar, but nothing is sent to the guest since the annotation's
      // book chapter is not loaded.
      frameSync.hoverAnnotation(ann);
      assert.calledWith(
        fakeStore.hoverAnnotations,
        sinon.match.array.deepEquals([ann.$tag])
      );
      assert.isFalse(guestRPC().call.calledWith('hoverAnnotations'));

      // Simulate annotation anchoring at a later point, after a chapter
      // navigation.
      emitGuestEvent('syncAnchoringStatus', { $tag: ann.$tag, $orphan: false });
      assert.calledWith(guestRPC().call, 'hoverAnnotations', [ann.$tag]);

      // After the `hoverAnnotations` call has been sent, the pending-hover
      // state internally should be cleared and a later `syncAnchoringStatus`
      // event should not re-hover.
      guestRPC().call.resetHistory();
      emitGuestEvent('syncAnchoringStatus', { $tag: ann.$tag, $orphan: false });
      assert.notCalled(guestRPC().call);
    });
  });

  describe('#scrollToAnnotation', () => {
    beforeEach(async () => {
      frameSync.connect();
    });

    it('does nothing if matching guest frame is not found', async () => {
      frameSync.scrollToAnnotation(fixtures.ann);
    });

    it('should scroll to the annotation in the correct guest', async () => {
      await connectGuest();
      emitGuestEvent('documentInfoChanged', fixtures.htmlDocumentInfo);

      frameSync.scrollToAnnotation(fixtures.ann);

      assert.calledWith(
        guestRPC().call,
        'scrollToAnnotation',
        fixtures.ann.$tag
      );
    });

    it('should trigger a navigation in an EPUB if needed', async () => {
      await connectGuest();
      emitGuestEvent('documentInfoChanged', fixtures.epubDocumentInfo);

      // Create an annotation with a CFI that doesn't match `fixtures.epubDocumentInfo`.
      const ann = createEPUBAnnotation('/4/8');

      // Request a scroll to this annotation, this will require a navigation of
      // the guest frame.
      frameSync.scrollToAnnotation(ann);

      assert.isFalse(guestRPC().call.calledWith('scrollToAnnotation'));
      assert.calledWith(
        guestRPC().call,
        'navigateToSegment',
        sinon.match({
          $tag: ann.$tag,
          target: ann.target,
        })
      );

      // After the guest navigates and the original target of the
      // `scrollToAnnotation` call is anchored in the new guest, the sidebar
      // should request that the new guest scroll to the annotation.
      emitGuestEvent('syncAnchoringStatus', { $tag: ann.$tag, $orphan: false });
      assert.calledWith(guestRPC().call, 'scrollToAnnotation', ann.$tag);

      // After the `scrollToAnnotation` call has been sent, the pending-scroll
      // state internally should be cleared and a later `syncAnchoringStatus`
      // event should not re-scroll.
      guestRPC().call.resetHistory();
      emitGuestEvent('syncAnchoringStatus', { $tag: ann.$tag, $orphan: false });
      assert.notCalled(guestRPC().call);
    });

    it('should not trigger a navigation in an EPUB if not needed', async () => {
      await connectGuest();
      emitGuestEvent('documentInfoChanged', fixtures.epubDocumentInfo);

      const ann = createEPUBAnnotation(
        fixtures.epubDocumentInfo.segmentInfo.cfi
      );
      frameSync.scrollToAnnotation(ann);

      assert.isFalse(guestRPC().call.calledWith('navigateToSegment'));
      assert.calledWith(guestRPC().call, 'scrollToAnnotation', ann.$tag);
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

  context('when content info in store changes', () => {
    const contentInfo = { item: { title: 'Some article' } };

    it('sends new content info to guests', async () => {
      await frameSync.connect();
      await connectGuest();

      fakeStore.setContentInfo(contentInfo);

      assert.calledWith(guestRPC().call, 'showContentInfo', contentInfo);
    });
  });

  context('when a toast message is pushed', () => {
    it('forwards the message to the host if it is hidden and the sidebar is collapsed', () => {
      const message = { visuallyHidden: true };

      emitHostEvent('sidebarClosed');
      fakeToastMessenger.emit('toastMessagePushed', message);

      assert.calledWith(hostRPC().call, 'toastMessagePushed', message);
    });

    it('ignores the message if it is not hidden', () => {
      const message = { visuallyHidden: false };

      emitHostEvent('sidebarClosed');
      fakeToastMessenger.emit('toastMessagePushed', message);

      assert.neverCalledWith(hostRPC().call, 'toastMessagePushed', message);
    });

    it('ignores the message if the sidebar is not collapsed', () => {
      const message = { visuallyHidden: true };

      fakeToastMessenger.emit('toastMessagePushed', message);

      assert.neverCalledWith(hostRPC().call, 'toastMessagePushed', message);
    });
  });
});
