import { Injector } from '../injector';

describe('Injector', () => {
  describe('#get', () => {
    it('calls a non-class factory as a function to create instance', () => {
      const instance = {};
      const factory = sinon.stub().returns(instance);

      const container = new Injector();
      container.register('service', factory);
      const constructed = container.get('service');

      assert.equal(constructed, instance);
    });

    it('calls a class factory with `new` to create instance', () => {
      class Foo {}

      const container = new Injector();
      container.register('foo', Foo);

      const constructed = container.get('foo');
      assert.instanceOf(constructed, Foo);
    });

    it('returns the existing instance if already constructed', () => {
      const instance = {};
      const factory = sinon.stub().returns(instance);

      const container = new Injector();
      container.register('service', factory);

      container.get('service');
      const constructed = container.get('service');

      assert.equal(constructed, instance);
      assert.calledOnce(factory);
    });

    it('resolves dependencies', () => {
      const container = new Injector();

      const foo = {};
      const bar = {};

      const fooFactory = sinon.stub().returns(foo);
      const barFactory = sinon.stub().returns(bar);
      const bazFactory = (foo, bar) => ({ foo, bar });
      bazFactory.$inject = ['foo', 'bar'];

      container.register('foo', fooFactory);
      container.register('bar', barFactory);
      container.register('baz', bazFactory);

      const baz = container.get('baz');
      assert.equal(baz.foo, foo);
      assert.equal(baz.bar, bar);
    });

    it('resolves transitive dependencies', () => {
      const container = new Injector();
      const addDeps = (factory, dependencies) => {
        factory.$inject = dependencies;
        return factory;
      };

      container.register('a', () => 'a');
      container.register(
        'b',
        addDeps(a => a + 'b', ['a'])
      );
      container.register(
        'c',
        addDeps((b, a) => b + 'c' + a, ['b', 'a'])
      );

      assert.equal(container.get('c'), 'abca');
    });

    it('throws an error if factory is not registered', () => {
      const container = new Injector();
      assert.throws(() => {
        container.get('invalid');
      }, '"invalid" is not registered');
    });

    it('throws an error if dependency is not registered', () => {
      const container = new Injector();
      const fooFactory = () => 42;
      fooFactory.$inject = ['bar'];

      container.register('foo', fooFactory);

      assert.throws(() => {
        container.get('foo');
      }, 'Failed to construct dependency "bar" of "foo"');
    });

    it('throws an error if a circular dependency is encountered', () => {
      const container = new Injector();
      const fooFactory = () => 42;
      fooFactory.$inject = ['foo'];

      container.register('foo', fooFactory);

      let err;
      try {
        container.get('foo');
      } catch (e) {
        err = e;
      }

      assert.instanceOf(err, Error);
      assert.equal(
        err.toString(),
        'Error: Failed to construct dependency "foo" of "foo": Encountered a circular dependency when constructing "foo"'
      );
      assert.instanceOf(err.cause, Error);
      assert.equal(
        err.cause.toString(),
        'Error: Encountered a circular dependency when constructing "foo"'
      );
    });
  });

  describe('#register', () => {
    it('returns container for chaining', () => {
      const container = new Injector();
      assert.equal(
        container.register('foo', () => 42),
        container
      );
    });
  });
});
