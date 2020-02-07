/* global Map */

function isClass(functionOrClass) {
  return functionOrClass.name.match(/^[A-Z]/);
}

/**
 * `Injector` is a dependency injection container.
 *
 * It provides a convenient way to instantiate a set of named objects with
 * dependencies. Objects are constructed using a factory function or
 * class constructor. The factory function or constructor may have dependencies
 * which are indicated by a `$inject` property on the function/class which
 * is a list of the names of the dependencies. The `$inject` property can be
 * added manually or by a compiler plugin (eg. `babel-plugin-angularjs-annotate`).
 *
 * To construct an object, call the `register` method with the name and factory
 * function/class for the object and each of its dependencies, and then call
 * the `get` method to construct or return the existing object with a given name,
 * along with all of its dependencies.
 */
export class Injector {
  constructor() {
    // Map of name to factory function that creates an instance or class used
    // as prototype for instance.
    this._factories = new Map();

    // Map of name to existing instance.
    this._instances = new Map();

    // Set of instances already being constructed. Used to detect circular
    // dependencies.
    this._constructing = new Set();
  }

  /**
   * Construct or return the existing instance of an object with a given `name`
   *
   * @param {string} name - Name of object to construct
   * @return {any} - The constructed object
   */
  get(name) {
    if (this._instances.has(name)) {
      return this._instances.get(name);
    }

    const factory = this._factories.get(name);

    if (!factory) {
      throw new Error(`"${name}" is not registered`);
    }

    if (this._constructing.has(name)) {
      throw new Error(
        `Encountered a circular dependency when constructing "${name}"`
      );
    }

    this._constructing.add(name);
    try {
      const resolvedDependencies = [];
      const dependencies = factory.$inject || [];

      for (const dependency of dependencies) {
        try {
          resolvedDependencies.push(this.get(dependency));
        } catch (e) {
          const resolveErr = new Error(
            `Failed to construct dependency "${dependency}" of "${name}": ${e.message}`
          );
          resolveErr.cause = e;
          throw resolveErr;
        }
      }

      let instance;
      if (isClass(factory)) {
        // eslint-disable-next-line new-cap
        instance = new factory(...resolvedDependencies);
      } else {
        instance = factory(...resolvedDependencies);
      }
      this._instances.set(name, instance);

      return instance;
    } finally {
      this._constructing.delete(name);
    }
  }

  /**
   * Register a factory with a given name.
   *
   * If `factory`'s name starts with an upper-case letter it is treated as a
   * class. If it starts with a lower-case letter it is treated as a factory
   * function, which may return any type of value.
   *
   * @param {string} name - Name of object
   * @param {() => any} factory -
   *   A function that constructs the service, or a class that will be instantiated
   *   when the object is requested.
   * @return {this}
   */
  register(name, factory) {
    this._factories.set(name, factory);
    return this;
  }
}
