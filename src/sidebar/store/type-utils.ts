type MapContravariant<T> = { [K in keyof T]: (x: T[K]) => void };

/**
 * Utility that turns a tuple type `[A, B, C]` into an intersection `A & B & C`.
 *
 * The implementation is magic adapted from
 * https://github.com/microsoft/TypeScript/issues/28323. Roughly speaking it
 * works by computing a type that could be assigned to any position in the
 * tuple, which must be the intersection of all the tuple element types.
 */
export type TupleToIntersection<
  T,
  Temp extends Record<number, unknown> = MapContravariant<T>
> = Temp[number] extends (x: infer U) => unknown ? U : never;

/**
 * Helper that strips the first argument from a function type.
 *
 * This maps a type like `(a: T1, b: T2, ...) => Result` to `(b: T2, ...) => Result`.
 */
export type OmitFirstArg<F> = F extends (x: any, ...args: infer P) => infer R
  ? (...args: P) => R
  : never;
