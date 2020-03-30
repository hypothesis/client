import { Injector } from '../injector';

describe('Injector', () => {
  describe('#get', () => {
    it('calls a "factory" provider as a function to create the object', () => {
      const instance = 'aValue';
      const factory = sinon.stub().callsFake(function () {
        assert.isUndefined(this);
        return instance;
      });

      const container = new Injector();
      container.register('service', { factory });
      const constructed = container.get('service');

      assert.equal(constructed, instance);
    });

    it('calls a "class" provider with `new` to create instance', () => {
      class Foo {}

      const container = new Injector();
      container.register('foo', Foo);
      container.register('foo2', { class: Foo });

      const constructed = container.get('foo');
      assert.instanceOf(constructed, Foo);

      const constructed2 = container.get('foo2');
      assert.instanceOf(constructed2, Foo);
    });

    it('uses the value of a "value" provider as the instance', () => {
      const instance = {};

      const container = new Injector();
      container.register('anObject', { value: instance });

      assert.equal(container.get('anObject'), instance);
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

      container.register('a', { value: 'a' });
      container.register('b', { factory: addDeps(a => a + 'b', ['a']) });
      container.register('c', {
        factory: addDeps((b, a) => b + 'c' + a, ['b', 'a']),
      });

      assert.equal(container.get('c'), 'abca');
    });

    it('throws an error if provider is not registered for name', () => {
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

    [{}, 'invalid', true, null, undefined].forEach(invalidProvider => {
      it('throws an error if the provider is not valid', () => {
        const container = new Injector();
        assert.throws(() => {
          container.register('foo', invalidProvider);
        }, `Invalid provider for "foo"`);
      });
    });
  });
});
