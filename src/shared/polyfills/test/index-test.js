import { requiredPolyfillSets } from '../';

function stubOut(obj, property, replacement = undefined) {
  const saved = obj[property];

  // We don't use `delete obj[property]` here because that isn't allowed for
  // some native APIs in some browsers.
  obj[property] = replacement;

  return () => {
    obj[property] = saved;
  };
}

describe('shared/polyfills/index', () => {
  describe('requiredPolyfillSets', () => {
    let undoStub;

    afterEach(() => {
      if (undoStub) {
        undoStub();
        undoStub = null;
      }
    });

    [
      {
        set: 'es2015',
        providesMethod: [Object, 'assign'],
      },
      {
        set: 'es2016',
        providesMethod: [Array.prototype, 'includes'],
      },
      {
        set: 'es2017',
        providesMethod: [Object, 'entries'],
      },
      {
        set: 'es2018',
        providesMethod: [Promise.prototype, 'finally'],
      },
      {
        set: 'es2018',
        providesMethod: [window, 'Promise'],
      },
      {
        set: 'string.prototype.normalize',
        providesMethod: [String.prototype, 'normalize'],
      },
      {
        // Missing URL constructor.
        set: 'url',
        providesMethod: [window, 'URL'],
      },
      {
        // Broken URL constructor.
        set: 'url',
        providesMethod: [window, 'URL', () => {}],
      },
      {
        set: 'fetch',
        providesMethod: [window, 'fetch'],
      },
    ].forEach(({ set, providesMethod }) => {
      it(`includes "${set}" if required`, () => {
        const [obj, method, replacement] = providesMethod;
        undoStub = stubOut(obj, method, replacement);
        const sets = requiredPolyfillSets([set]);
        assert.deepEqual(sets, [set]);
      });

      it(`does not include "${set}" if not required`, () => {
        assert.deepEqual(requiredPolyfillSets([set]), []);
      });
    });
  });
});
