import { parse, parseLast, stringify } from '../query-string';

describe('sidebar/util/query-string', () => {
  describe('parse, parseLast', () => {
    [parse, parseLast].forEach(parseFn => {
      it('returns parsed record', () => {
        const query = '?foo=bar+baz%2Fboop&baz=meep';
        const parsed = parseFn(query);
        assert.deepEqual(parsed, { foo: 'bar baz/boop', baz: 'meep' });
      });

      it('returns object without a prototype', () => {
        const parsed = parseFn('?foo=bar');
        assert.isFalse('hasOwnProperty' in parsed);
      });
    });
  });

  describe('parse', () => {
    it('returns array if parameter is repeated', () => {
      const query = '?foo=one&foo=two';
      const parsed = parse(query);
      assert.deepEqual(parsed, { foo: ['one', 'two'] });
    });
  });

  describe('parseLast', () => {
    it('returns last value if parameter is repeated', () => {
      const query = '?foo=one&foo=two';
      const parsed = parseLast(query);
      assert.deepEqual(parsed, { foo: 'two' });
    });
  });

  describe('stringify', () => {
    it('returns formatted query with sorted params', () => {
      const params = { foo: 'bar baz/boop', baz: 'meep' };
      const formatted = stringify(params);
      assert.equal(formatted, 'baz=meep&foo=bar+baz%2Fboop');
    });

    it('stringifies numbers and booleans', () => {
      const params = { aBool: true, aNumber: 1.23 };
      const formatted = stringify(params);
      assert.equal(formatted, 'aBool=true&aNumber=1.23');
    });

    it('adds parameter multiple times if value is an array', () => {
      const params = { foo: ['one', 'two'] };
      const formatted = stringify(params);
      assert.equal(formatted, 'foo=one&foo=two');
    });
  });
});
