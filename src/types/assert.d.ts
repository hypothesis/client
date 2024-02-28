import type { assert as chaiAssert } from 'chai';
import type { assert as sinonAssert } from 'sinon';

// This represents the type of the rejects function from
// src/test-utils/assert-methods.js
// Defined here as a local type to avoid a dependency with that module
type Rejects = <T>(
  promiseResult: Promise<T>,
  errorMessage: RegExp | string,
) => Promise<T>;

// During tests bootstrap, we expose chai's assert as a global and merge it with
// sinon's one.
declare global {
  const assert: typeof chaiAssert & typeof sinonAssert & { rejects: Rejects };
}
