import { EventBus } from '../util/emitter';

import AnnotationSync from '../annotation-sync';

describe('AnnotationSync', () => {
  let createAnnotationSync;
  let emitter;
  let fakeBridge;
  let publish;
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    const eventBus = new EventBus();
    emitter = eventBus.createEmitter();

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
      return new AnnotationSync(eventBus, fakeBridge);
    };

    publish = (method, ...args) => listeners[method](...args);
  });

  afterEach(() => {
    sandbox.restore();
    emitter.destroy();
  });

  describe('#constructor', () => {
    context('when "deleteAnnotation" is published', () => {
      it('calls publish("annotationDeleted")', () => {
        const ann = { id: 1, $tag: 'tag1' };
        const eventStub = sinon.stub();
        emitter.subscribe('annotationDeleted', eventStub);
        createAnnotationSync();

        publish('deleteAnnotation', { msg: ann }, () => {});

        assert.calledWith(eventStub, ann);
      });

      it("calls the 'deleteAnnotation' event's callback function", done => {
        const ann = { id: 1, $tag: 'tag1' };
        const callback = function (err, ret) {
          assert.isNull(err);
          assert.deepEqual(ret, { tag: 'tag1', msg: ann });
          done();
        };
        createAnnotationSync();

        publish('deleteAnnotation', { msg: ann }, callback);
      });

      it('deletes any existing annotation from its cache before calling publish', done => {
        const annSync = createAnnotationSync();
        const ann = { id: 1, $tag: 'tag1' };
        annSync.cache.tag1 = ann;
        emitter.subscribe('annotationDeleted', () => {
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

    context('when "loadAnnotations" is published', () => {
      it('calls publish("annotationsLoaded")', () => {
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
        emitter.subscribe('annotationsLoaded', loadedStub);
        createAnnotationSync();

        publish('loadAnnotations', bodies, () => {});

        assert.calledWith(loadedStub, annotations);
      });
    });

    context('when "beforeAnnotationCreated" is published', () => {
      it('calls bridge.call() passing the event', () => {
        // nb. Setting an empty `$tag` here matches what `Guest#createAnnotation`
        // does.
        const ann = { id: 1, $tag: '' };
        createAnnotationSync();

        emitter.publish('beforeAnnotationCreated', ann);

        assert.called(fakeBridge.call);
        assert.calledWith(fakeBridge.call, 'beforeCreateAnnotation', {
          msg: ann,
          tag: ann.$tag,
        });
      });

      it('assigns a non-empty tag to the annotation', () => {
        const ann = { id: 1, $tag: '' };
        createAnnotationSync();

        emitter.publish('beforeAnnotationCreated', ann);

        assert.notEmpty(ann.$tag);
      });

      context('if the annotation already has a $tag', () => {
        it('does not call bridge.call()', () => {
          const ann = { id: 1, $tag: 'tag1' };
          createAnnotationSync();

          emitter.publish('beforeAnnotationCreated', ann);

          assert.notCalled(fakeBridge.call);
        });

        it('does not modify the tag', () => {
          const ann = { id: 1, $tag: 'sometag' };
          createAnnotationSync();

          emitter.publish('beforeAnnotationCreated', ann);

          assert.equal(ann.$tag, 'sometag');
        });
      });
    });
  });

  describe('#sync', () => {
    it('calls "sync" method of the bridge', () => {
      const ann = { id: 1 };
      const annotationSync = createAnnotationSync();

      annotationSync.sync([ann]);

      assert.calledWith(fakeBridge.call, 'sync', [{ msg: ann, tag: ann.$tag }]);
    });
  });

  describe('#destroy', () => {
    it('ignores "beforeAnnotationCreated" events from the annotator', () => {
      const annotationSync = createAnnotationSync();
      annotationSync.destroy();

      emitter.publish('beforeAnnotationCreated', { id: 1, $tag: '' });

      assert.notCalled(fakeBridge.call);
    });
  });
});
