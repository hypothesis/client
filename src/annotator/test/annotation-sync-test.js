import { AnnotationSync } from '../annotation-sync';

describe('AnnotationSync', () => {
  let createAnnotationSync;
  let fakeBridge;
  let publish;
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    const listeners = {};

    fakeBridge = {
      on: sandbox.spy((method, fn) => {
        listeners[method] = fn;
      }),
      call: sandbox.stub(),
      onConnect: sandbox.stub(),
      links: [],
    };

    createAnnotationSync = () => {
      return new AnnotationSync(fakeBridge);
    };

    publish = (method, ...args) => listeners[method](...args);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('handling events from the sidebar', () => {
    describe('on "deleteAnnotation" event', () => {
      it('publish "annotationDeleted" to the annotator', () => {
        const ann = { id: 1, $tag: 'tag1' };
        const eventStub = sinon.stub();
        const annSync = createAnnotationSync();
        annSync.on('annotationDeleted', eventStub);

        publish('deleteAnnotation', { msg: ann }, () => {});

        assert.calledWith(eventStub, ann);
      });

      it('calls the "deleteAnnotation" event\'s callback function', done => {
        const ann = { id: 1, $tag: 'tag1' };
        const callback = function (err, result) {
          assert.isNull(err);
          assert.isUndefined(result);
          done();
        };
        createAnnotationSync();

        publish('deleteAnnotation', { msg: ann }, callback);
      });

      it('deletes any existing annotation from its cache before publishing event to the annotator', done => {
        const annSync = createAnnotationSync();
        const ann = { id: 1, $tag: 'tag1' };
        annSync.cache.tag1 = ann;
        annSync.on('annotationDeleted', () => {
          assert.isUndefined(annSync.cache.tag1);
          done();
        });

        publish('deleteAnnotation', { msg: ann }, () => {});
      });

      it('deletes any existing annotation from its cache', () => {
        const ann = { id: 1, $tag: 'tag1' };
        const annSync = createAnnotationSync();
        annSync.cache.tag1 = ann;

        publish('deleteAnnotation', { msg: ann }, () => {});

        assert.isUndefined(annSync.cache.tag1);
      });
    });

    describe('on "loadAnnotations" event', () => {
      it('publishes "annotationsLoaded" to the annotator', () => {
        const annotations = [
          { id: 1, $tag: 'tag1' },
          { id: 2, $tag: 'tag2' },
          { id: 3, $tag: 'tag3' },
        ];
        const bodies = [
          { msg: annotations[0], tag: annotations[0].$tag },
          { msg: annotations[1], tag: annotations[1].$tag },
          { msg: annotations[2], tag: annotations[2].$tag },
        ];
        const loadedStub = sinon.stub();
        const annSync = createAnnotationSync();
        annSync.on('annotationsLoaded', loadedStub);

        publish('loadAnnotations', bodies, () => {});

        assert.calledWith(loadedStub, annotations);
      });
    });
  });

  describe('#createAnnotation', () => {
    it('calls "createAnnotation" RPC method in the sidebar', () => {
      // nb. Setting an empty `$tag` here matches what `Guest#createAnnotation`
      // does.
      const ann = { id: 1, $tag: '' };
      const annSync = createAnnotationSync();

      annSync.createAnnotation(ann);

      assert.called(fakeBridge.call);
      assert.calledWith(fakeBridge.call, 'createAnnotation', {
        msg: ann,
        tag: ann.$tag,
      });
    });

    it('assigns a non-empty tag to the annotation', () => {
      const ann = { id: 1, $tag: '' };
      const annSync = createAnnotationSync();

      annSync.createAnnotation(ann);

      assert.notEmpty(ann.$tag);
    });

    context('if the annotation already has a $tag', () => {
      it('does not call bridge.call()', () => {
        const ann = { id: 1, $tag: 'tag1' };
        const annSync = createAnnotationSync();

        annSync.createAnnotation(ann);

        assert.notCalled(fakeBridge.call);
      });

      it('does not modify the tag', () => {
        const ann = { id: 1, $tag: 'sometag' };
        const annSync = createAnnotationSync();

        annSync.createAnnotation(ann);

        assert.equal(ann.$tag, 'sometag');
      });
    });
  });

  describe('#sync', () => {
    it('calls "syncAnchoringStatus" RPC method in the sidebar', () => {
      const ann = { id: 1 };
      const annotationSync = createAnnotationSync();

      annotationSync.sync([ann]);

      assert.calledWith(fakeBridge.call, 'syncAnchoringStatus', [
        { msg: ann, tag: ann.$tag },
      ]);
    });
  });

  describe('#destroy', () => {
    it('ignore `loadAnnotations` and `deleteAnnotation` events from the sidebar', () => {
      const ann = { msg: { id: 1 }, tag: 'tag1' };
      const annotationSync = createAnnotationSync();
      annotationSync.destroy();
      const cb = sinon.stub();

      publish('loadAnnotations', [ann], cb);
      publish('deleteAnnotation', ann, cb);

      assert.calledTwice(cb);
      assert.calledWith(cb.firstCall, null);
      assert.calledWith(cb.secondCall, null);
    });

    it('disables annotation syncing with the sidebar', () => {
      const annotationSync = createAnnotationSync();
      annotationSync.destroy();

      annotationSync.sync([{ id: 1 }]);

      assert.notCalled(fakeBridge.call);
    });
  });
});
