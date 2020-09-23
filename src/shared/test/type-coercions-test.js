import coercions from '../type-coercions';

describe('shared/type-coercions', () => {
  describe('toBoolean', () => {
    [
      {
        value: true,
        result: true,
      },
      {
        value: 'true',
        result: true,
      },
      {
        value: 'any',
        result: true,
      },
      {
        value: 'false',
        result: false,
      },
      {
        value: ' false',
        result: false,
      },
      {
        value: 'False',
        result: false,
      },
      {
        value: 'FALSE',
        result: false,
      },
      {
        value: '',
        result: false,
      },
      {
        value: '1',
        result: true,
      },
      {
        value: '0',
        result: false,
      },
      {
        value: 1,
        result: true,
      },
      {
        value: undefined,
        result: false,
      },
    ].forEach(test => {
      it('coerces the values appropriately', () => {
        assert.equal(coercions.toBoolean(test.value), test.result);
        assert.equal(coercions.toBoolean.orNull(test.value), test.result);
      });
    });

    it('coerces null appropriately', () => {
      assert.equal(coercions.toBoolean(null), false);
      assert.equal(coercions.toBoolean.orNull(null), null);
    });
  });

  describe('toInteger', () => {
    [
      {
        value: '1',
        result: 1,
      },
      {
        value: '0',
        result: 0,
      },
      {
        value: 1,
        result: 1,
      },
      {
        value: 1.1,
        result: 1,
      },
      {
        value: 'a',
        result: NaN,
      },
    ].forEach(test => {
      it('coerces the values appropriately', () => {
        assert.deepEqual(coercions.toInteger(test.value), test.result);
        assert.deepEqual(coercions.toInteger.orNull(test.value), test.result);
      });
    });

    it('coerces null appropriately', () => {
      assert.deepEqual(coercions.toInteger(null), NaN);
      assert.deepEqual(coercions.toInteger.orNull(null), null);
    });
  });

  describe('toObject', () => {
    [
      {
        value: { a: 'a', b: { c: ['c'] } },
        result: { a: 'a', b: { c: ['c'] } },
      },
      {
        value: 1,
        result: {},
      },
      {
        value: undefined,
        result: {},
      },
    ].forEach(test => {
      it('coerces the values appropriately', () => {
        assert.deepEqual(coercions.toObject(test.value), test.result);
        assert.deepEqual(coercions.toObject.orNull(test.value), test.result);
      });
    });

    it('coerces null appropriately', () => {
      assert.deepEqual(coercions.toObject(null), {});
      assert.deepEqual(coercions.toObject.orNull(null), null);
    });

    describe('shape', () => {
      let shape;
      beforeEach(() => {
        shape = coercions.toObject.shape(value => {
          return {
            a: value.a,
            b: value.b,
          };
        });
      });

      [
        {
          value: { a: 1, b: 2 },
          result: { a: 1, b: 2 },
        },
        {
          value: { a: 1, b: 2, c: 3 },
          result: { a: 1, b: 2 },
        },
        {
          value: { c: 3 },
          result: { a: undefined, b: undefined },
        },
        {
          value: 'fake',
          result: { a: undefined, b: undefined },
        },
      ].forEach(test => {
        it('coerces the values appropriately', () => {
          assert.deepEqual(shape(test.value), test.result);
          assert.deepEqual(shape.orNull(test.value), test.result);
        });
      });

      it('coerces null appropriately', () => {
        assert.deepEqual(shape(null), { a: undefined, b: undefined });
        assert.deepEqual(shape.orNull(null), null);
      });
    });
  });

  describe('toString', () => {
    [
      {
        value: 'a',
        result: 'a',
      },
      {
        value: 1,
        result: '1',
      },
      {
        value: undefined,
        result: '',
      },
      {
        value: {
          // In a rare case where its an object with custom
          // toString value that is not a function.
          toString: false,
        },
        result: '',
      },
    ].forEach(test => {
      it('coerces the values appropriately', () => {
        assert.equal(coercions.toString(test.value), test.result);
        assert.equal(coercions.toString.orNull(test.value), test.result);
      });
    });

    it('coerces null appropriately', () => {
      assert.deepEqual(coercions.toString(null), '');
      assert.deepEqual(coercions.toString.orNull(null), null);
    });
  });

  describe('custom', () => {
    let custom;
    beforeEach(() => {
      custom = coercions.custom(value => {
        if (value === 'any?') {
          return 'any!';
        } else {
          return 'none!';
        }
      });
    });

    [
      {
        value: 'any?',
        result: 'any!',
      },
      {
        value: 1,
        result: 'none!',
      },
    ].forEach(test => {
      it('coerces the values appropriately', () => {
        assert.equal(custom(test.value), test.result);
        assert.equal(custom.orNull(test.value), test.result);
      });
    });

    it('coerces null appropriately', () => {
      assert.deepEqual(custom(null), 'none!');
      assert.deepEqual(custom.orNull(null), null);
    });
  });

  describe('any', () => {
    [true, null, undefined, NaN, {}, 'string', () => {}].forEach(test => {
      it('returns the original value', () => {
        assert.deepEqual(coercions.any(test), test);
      });
    });
  });
});
