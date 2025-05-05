import { compareThreads, $imports } from '../thread-sorters';

describe('sidebar/util/thread-sorters', () => {
  let fakeRootAnnotations;
  let fakeLocation;

  beforeEach(() => {
    // The thread argument passed to `Newest` or `Oldest` sorting functions
    // gets wrapped with an additional Array by `*RootAnnotationDate` before
    // being passed on to `rootAnnotations`. This unwraps that extra array
    // and returns the original first argument to `*RootAnnotationDate`
    fakeRootAnnotations = sinon.stub().callsFake(threads => threads[0]);
    fakeLocation = sinon.stub().callsFake(annotation => annotation.location);

    $imports.$mock({
      './annotation-metadata': { location: fakeLocation },
      './thread': { rootAnnotations: fakeRootAnnotations },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  describe('sorting by newest annotation thread first', () => {
    [
      {
        a: [{ created: 40 }, { created: 5 }],
        b: [{ created: 20 }, { created: 3 }],
        expected: -1,
      },
      {
        a: [{ created: 20 }, { created: 3 }],
        b: [{ created: 20 }, { created: 3 }],
        expected: 0,
      },
      {
        a: [{ created: 20 }, { created: 3 }],
        b: [{ created: 40 }, { created: 5 }],
        expected: 1,
      },
    ].forEach(testCase => {
      it('sorts by newest created root annotation', () => {
        assert.equal(
          compareThreads(testCase.a, testCase.b, { sortBy: 'newest' }),
          testCase.expected,
        );
      });
    });
  });

  describe('sorting by oldest annotation thread first', () => {
    [
      {
        a: [{ created: 20 }, { created: 5 }],
        b: [{ created: 40 }, { created: 3 }],
        expected: 1,
      },
      {
        a: [{ created: 20 }, { created: 3 }],
        b: [{ created: 20 }, { created: 3 }],
        expected: 0,
      },
      {
        a: [{ created: 40 }, { created: 3 }],
        b: [{ created: 20 }, { created: 5 }],
        expected: -1,
      },
    ].forEach(testCase => {
      it('sorts by oldest created root annotation', () => {
        assert.equal(
          compareThreads(testCase.a, testCase.b, { sortBy: 'oldest' }),
          testCase.expected,
        );
      });
    });
  });

  describe('sorting by document location', () => {
    const oldDate = '2024-01-01T12:00:00';
    const newDate = '2024-01-02T12:00:00';

    function thread(location, created = oldDate) {
      return { annotation: { location, created } };
    }

    // Thread whose annotation has no location information. This should always
    // sort before annotations with location info.
    const noLocationThread = thread({});

    // Create a position-only location. This is the common case for a web page
    // or PDF.
    function charOffset(pos) {
      return { charOffset: pos };
    }

    // Create a location with an EPUB CFI and position. This would occur in
    // an ebook.
    function cfiLocation(cfi, pos) {
      return { cfi, charOffset: pos };
    }

    const compareLocation = (a, b) =>
      compareThreads(a, b, { sortBy: 'location' });

    // Check comparison of three threads by a certain location field where:
    //
    // - a and b have different values for the field and a < b.
    // - b and c have equal values for the field, but b was created first
    const checkOrdering = (a, b, c) => {
      assert.equal(compareLocation(a, b), -1);
      assert.equal(compareLocation(a, a), 0);
      assert.equal(compareLocation(b, a), 1);
      assert.equal(compareLocation(b, c), -1);

      // A thread without the location field is treated as having a minimum
      // value for that field.
      assert.equal(compareLocation(noLocationThread, a), -1);
      assert.equal(compareLocation(a, noLocationThread), 1);
    };

    it('sorts by CFI', () => {
      const a = thread(cfiLocation('/2/2'));
      const b = thread(cfiLocation('/2/4'));
      const c = thread(cfiLocation('/2/4'), newDate);
      checkOrdering(a, b, c);
    });

    it('sorts by page index', () => {
      const a = thread({ pageIndex: 1 });
      const b = thread({ pageIndex: 2 });
      const c = thread({ pageIndex: 2 }, newDate);
      checkOrdering(a, b, c);
    });

    it('sorts by distance from top of page', () => {
      const a = thread({ top: 1 });
      const b = thread({ top: 2 });
      const c = thread({ top: 2 }, newDate);
      checkOrdering(a, b, c);
    });

    it('sorts by character offset', () => {
      const a = thread(charOffset(5));
      const b = thread(charOffset(10));
      const c = thread(charOffset(10), newDate);
      checkOrdering(a, b, c);
    });

    it('sorts by creation date if annotations do not have comparable locations', () => {
      const a = thread({}, oldDate);
      const b = thread({}, newDate);

      assert.equal(compareLocation(a, b), -1);
      assert.equal(compareLocation(a, a), 0);
      assert.equal(compareLocation(b, a), 1);
    });

    it('sorts by CFI > page > position > char offset > creation date', () => {
      // Create annotations with all location properties, where `a < b` for
      // each property.
      const a = thread({
        cfi: '/2/2',
        pageIndex: 1,
        top: 100,
        charOffset: 10,
      });

      const b = thread(
        {
          cfi: '/2/4',
          pageIndex: 2,
          top: 101,
          charOffset: 15,
        },
        newDate,
      );

      const deleteFields = (thread, fields) => {
        const clone = structuredClone(thread);
        for (const field of fields) {
          delete clone.annotation.location[field];
        }
        return clone;
      };

      // Incrementally remove the highest-priority sort fields, and check that
      // sorting works as expected.
      const fields = ['cfi', 'pageIndex', 'top', 'charOffset'];
      for (let i = 0; i < fields.length; i++) {
        const fieldsToDelete = fields.slice(0, i);
        const aReduced = deleteFields(a, fieldsToDelete);
        const bReduced = deleteFields(b, fieldsToDelete);

        assert.equal(compareLocation(aReduced, bReduced), -1);
        assert.equal(compareLocation(bReduced, aReduced), 1);
      }
    });

    it('compares threads by annotation presence', () => {
      const a = {};
      const b = { annotation: { created: oldDate } };

      assert.equal(compareLocation(a, b), -1);
      assert.equal(compareLocation(b, a), 1);
      assert.equal(compareLocation(a, a), 0);
    });
  });
});
