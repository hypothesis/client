'use strict';

var angular = require('angular');
var EventEmitter = require('tiny-emitter');

var annotationFixtures = require('./annotation-fixtures');
var events = require('../events');
var FrameSync = require('../frame-sync').default;
var fakeStore = require('./fake-redux-store');
var formatAnnot = require('../frame-sync').formatAnnot;

var fixtures = {
  ann: Object.assign({$$tag: 't1'}, annotationFixtures.defaultAnnotation()),

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
  },

  // Response to the `getDocumentInfo` channel message for a frame displaying
  // a PDF
  pdfDocumentInfo: {
    uri: 'http://example.org/paper.pdf',
    metadata: {
      documentFingerprint: '1234',
      link: [{href: 'http://example.org/paper.pdf'}, {href:'urn:1234'}],
    },
  },
};

describe('FrameSync', function () {
  var fakeAnnotationUI;
  var fakeBridge;
  var frameSync;
  var $rootScope;

  before(function () {
    angular.module('app', [])
      .service('frameSync', FrameSync);
  });

  beforeEach(function () {
    fakeAnnotationUI = fakeStore({annotations: []});
    fakeAnnotationUI.updateAnchorStatus = sinon.stub();

    var emitter = new EventEmitter();
    fakeBridge = {
      call: sinon.stub(),
      createChannel: sinon.stub(),
      on: emitter.on.bind(emitter),
      onConnect: function (listener) {
        emitter.on('connect', listener);
      },

      emit: emitter.emit.bind(emitter),
    };

    function FakeDiscovery() {
      this.startDiscovery = sinon.stub();
    }

    angular.mock.module('app', {
      AnnotationUISync: sinon.stub(),
      Discovery: FakeDiscovery,
      annotationUI: fakeAnnotationUI,
      bridge: fakeBridge,
    });

    angular.mock.inject(function (_$rootScope_, _frameSync_) {
      $rootScope = _$rootScope_;
      frameSync = _frameSync_;
    });
  });

  beforeEach(function () {
    frameSync.connect();
  });

  context('when annotations are loaded into the sidebar', function () {
    it('sends a "loadAnnotations" message to the frame', function () {
      fakeAnnotationUI.setState({annotations: [fixtures.ann]});
      assert.calledWithMatch(fakeBridge.call, 'loadAnnotations', sinon.match([
        formatAnnot(fixtures.ann),
      ]));
    });

    it('sends a "loadAnnotations" message only for new annotations', function () {
      var ann2 = Object.assign({}, fixtures.ann, {$$tag: 't2', id: 'a2'});
      fakeAnnotationUI.setState({annotations: [fixtures.ann]});
      fakeBridge.call.reset();

      fakeAnnotationUI.setState({annotations: [fixtures.ann, ann2]});

      assert.calledWithMatch(fakeBridge.call, 'loadAnnotations', sinon.match([
        formatAnnot(ann2),
      ]));
    });

    it('does not send a "loadAnnotations" message for replies', function () {
      fakeAnnotationUI.setState({annotations: [annotationFixtures.newReply()]});
      assert.notCalled(fakeBridge.call);
    });
  });

  context('when annotations are removed from the sidebar', function () {
    it('sends a "deleteAnnotation" message to the frame', function () {
      fakeAnnotationUI.setState({annotations: [fixtures.ann]});
      fakeAnnotationUI.setState({annotations: []});
      assert.calledWithMatch(fakeBridge.call, 'deleteAnnotation',
        sinon.match(formatAnnot(fixtures.ann)));
    });
  });

  context('when a new annotation is created in the frame', function () {
    it('emits a BEFORE_ANNOTATION_CREATED event', function () {
      var onCreated = sinon.stub();
      var ann = {target: []};
      $rootScope.$on(events.BEFORE_ANNOTATION_CREATED, onCreated);

      fakeBridge.emit('beforeCreateAnnotation', {tag: 't1', msg: ann});

      assert.calledWithMatch(onCreated, sinon.match.any, sinon.match({
        $$tag: 't1',
        target: [],
      }));
    });
  });

  context('when anchoring completes', function () {
    it('updates the anchoring status for the annotation', function () {
      fakeBridge.emit('sync', [{tag: 't1', msg: {$orphan: false}}]);
      assert.calledWith(fakeAnnotationUI.updateAnchorStatus, null, 't1', false);
    });

    it('emits an ANNOTATIONS_SYNCED event', function () {
      var onSync = sinon.stub();
      $rootScope.$on(events.ANNOTATIONS_SYNCED, onSync);

      fakeBridge.emit('sync', [{tag: 't1', msg: {$orphan: false}}]);

      assert.calledWithMatch(onSync, sinon.match.any, sinon.match(['t1']));
    });
  });

  context('when a new frame connects', function () {
    var frameInfo;
    var fakeChannel = {
      call: function (name, callback) {
        callback(null, frameInfo);
      },
    };

    it("adds the page's metadata to the frames list", function () {
      frameInfo = fixtures.htmlDocumentInfo;

      fakeBridge.emit('connect', fakeChannel);

      assert.deepEqual(frameSync.frames, [{
        documentFingerprint: undefined,
        searchUris: [frameInfo.uri],
        uri: frameInfo.uri,
      }]);
    });

    it('adds the document fingerprint for PDFs', function () {
      frameInfo = fixtures.pdfDocumentInfo;

      fakeBridge.emit('connect', fakeChannel);

      assert.deepEqual(frameSync.frames, [{
        documentFingerprint: frameInfo.metadata.documentFingerprint,
        searchUris: [frameInfo.uri, 'urn:1234'],
        uri: frameInfo.uri,
      }]);
    });
  });
});
