import type { assert as chaiAssert } from 'chai';
import type { assert as sinonAssert } from 'sinon';

import type { rejects } from './assert-methods';

// During tests bootstrap, we expose sinon's assert and merge it with chai's
// one. Then, on tests, we perform assertions via the global `assert` object.
// This informs typescript about the existence of a global `assert` object which
// has the types of both chai's assert and sinon's assert.
// Additionally, we also add the `rejects` method to it.
declare global {
  const assert: typeof chaiAssert &
    typeof sinonAssert & { rejects: typeof rejects };
}
