import EventEmitter from 'tiny-emitter';

import AnnotationSync from '../annotation-sync';

describe('AnnotationSync', () => {
  let createAnnotationSync;
  let fakeBridge;
  let options;
  let publish;
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    const emitter = new EventEmitter();
    const listeners = {};

    createAnnotationSync = function () {
      return new AnnotationSync(fakeBridge, options);
    };

    fakeBridge = {
      register: sandbox.spy((method, fn) => {
        listeners[method] = fn;
      }),
      call: sandbox.stub(),
      onConnect: sandbox.stub(),
      links: [],
    };

    options = {
      on: emitter.on.bind(emitter), // eslint-disable-line no-restricted-properties
      emit: emitter.emit.bind(emitter), // eslint-disable-line no-restricted-properties
    };

    publish = function () {
      const method = arguments[0];
      const args = [].slice.call(arguments, 1);

      listeners[method].apply(listeners, args);
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('#constructor', () => {
    context('when "deleteAnnotation" is published', () => {
      it('calls emit("annotationDeleted")', () => {
        const ann = { id: 1, $tag: 'tag1' };
        const eventStub = sinon.stub();
        options.on('annotationDeleted', eventStub);
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

      it('deletes any existing annotation from its cache before calling emit', () => {
        const ann = { id: 1, $tag: 'tag1' };
        const annSync = createAnnotationSync();
        annSync.cache.tag1 = ann;
        options.emit = function () {
          assert(!annSync.cache.tag1);
        };

        publish('deleteAnnotation', { msg: ann }, () => {});
      });

      it('deletes any existing annotation from its cache', () => {
        const ann = { id: 1, $tag: 'tag1' };
        const annSync = createAnnotationSync();
        annSync.cache.tag1 = ann;

        publish('deleteAnnotation', { msg: ann }, () => {});

        assert(!annSync.cache.tag1);
      });
    });

    context('when "loadAnnotations" is published', () => {
      it('calls emit("annotationsLoaded")', () => {
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
        options.on('annotationsLoaded', loadedStub);
        createAnnotationSync();

        publish('loadAnnotations', bodies, () => {});

        assert.calledWith(loadedStub, annotations);
      });
    });

    context('when "beforeAnnotationCreated" is emitted', () => {
      it('calls bridge.call() passing the event', () => {
        // nb. Setting an empty `$tag` here matches what `Guest#createAnnotation`
        // does.
        const ann = { id: 1, $tag: '' };
        createAnnotationSync();

        options.emit('beforeAnnotationCreated', ann);

        assert.called(fakeBridge.call);
        assert.calledWith(fakeBridge.call, 'beforeCreateAnnotation', {
          msg: ann,
          tag: ann.$tag,
        });
      });

      it('assigns a non-empty tag to the annotation', () => {
        const ann = { id: 1, $tag: '' };
        createAnnotationSync();

        options.emit('beforeAnnotationCreated', ann);

        assert.notEmpty(ann.$tag);
      });

      context('if the annotation already has a $tag', () => {
        it('does not call bridge.call()', () => {
          const ann = { id: 1, $tag: 'tag1' };
          createAnnotationSync();

          options.emit('beforeAnnotationCreated', ann);

          assert.notCalled(fakeBridge.call);
        });

        it('does not modify the tag', () => {
          const ann = { id: 1, $tag: 'sometag' };
          createAnnotationSync();

          options.emit('beforeAnnotationCreated', ann);

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
});
