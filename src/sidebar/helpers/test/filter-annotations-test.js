import { filterAnnotations, $imports } from '../filter-annotations';

function isoDateWithAge(age) {
  return new Date(Date.now() - age * 1000).toISOString();
}

const poem = {
  tiger: `Tyger Tyger, burning bright
          In the forest of the night;
          What immortal  hand  or eye,
          Could frame thy fearful symmetry?`,
  raven: `Once upon a midnight dreary, when I pondered, weak and weary,
          Over many a quaint and curious volume of forgotten lore-
          While I nodded, nearly napping, suddely there came a tapping,
          As of some one gently rapping, rapping at my chamber door.
          “’Tis some visitor,” I muttered, “tapping at my chamber door—
          Only this and nothing more.”`,
};

describe('sidebar/helpers/filter-annotations', () => {
  let fakeUnicode;

  beforeEach(() => {
    fakeUnicode = {
      removeMarks: sinon.stub().returnsArg(0),
      normalize: sinon.stub().returnsArg(0),
    };

    $imports.$mock({
      '../util/unicode': fakeUnicode,
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  describe('#filter', () => {
    it('applies unicode-aware case folding to filter terms', () => {
      const filters = {
        text: { terms: ['Tiger'], operator: 'and' },
      };

      filterAnnotations([], filters);

      assert.calledWith(fakeUnicode.removeMarks, 'Tiger');
    });
  });

  describe('filter operators', () => {
    let annotations;

    beforeEach(() => {
      annotations = [
        { id: 1, text: poem.tiger },
        { id: 2, text: poem.raven },
      ];
    });

    it('requires all terms to match for "and" operator', () => {
      const filters = {
        text: { terms: ['Tyger', 'burning', 'bright'], operator: 'and' },
      };

      const result = filterAnnotations(annotations, filters);

      assert.deepEqual(result, annotations.slice(0, 1));
    });

    it('requires at least one term to match for "or" operator', () => {
      const filters = {
        text: { terms: ['Tyger', 'quaint'], operator: 'or' },
      };

      const result = filterAnnotations(annotations, filters);

      assert.equal(result.length, 2);
    });
  });

  describe('"any" field', () => {
    it('finds matches in any field', () => {
      const defaultFields = {
        text: '',
        tags: [],
        uri: 'https://example.com',
        target: [{}],
      };
      const annotations = [
        { id: 1, ...defaultFields, text: poem.tiger },
        { id: 4, ...defaultFields, user: 'lion' },
        { id: 2, ...defaultFields, user: 'Tyger' },
        { id: 3, ...defaultFields, tags: ['Tyger'] },
      ];
      const filters = { any: { terms: ['Tyger'], operator: 'and' } };

      const result = filterAnnotations(annotations, filters);

      assert.equal(result.length, 3);
    });

    it('matches if combined fields match "and" query', () => {
      const annotation = {
        id: 1,
        text: poem.tiger,
        target: [
          {
            selector: [
              {
                type: 'TextQuoteSelector',
                exact: 'The Tyger by William Blake',
              },
            ],
          },
        ],
        user: 'acct:poe@edgar.com',
        tags: ['poem', 'Blake', 'Tyger'],
      };

      // A query which matches the combined fields from the annotation, but not
      // individual fields on their own.
      const filters = {
        any: {
          terms: ['burning', 'William', 'poem', 'bright'],
          operator: 'and',
        },
      };

      const result = filterAnnotations([annotation], filters);

      assert.equal(result.length, 1);
    });
  });

  describe('"uri" field', () => {
    it("matches if the query occurs in the annotation's URI", () => {
      const annotation = {
        id: 1,
        uri: 'https://publisher.org/article',
      };
      const filters = { uri: { terms: ['publisher'], operator: 'or' } };

      const result = filterAnnotations([annotation], filters);

      assert.deepEqual(result, [annotation]);
    });
  });

  describe('"user" field', () => {
    let id = 0;
    function annotationWithUser(username, displayName = null) {
      ++id;
      return {
        id,
        user: `acct:${username}@example.com`,
        user_info: {
          display_name: displayName,
        },
      };
    }

    function userQuery(term) {
      return { user: { terms: [term], operator: 'or' } };
    }

    it('matches username', () => {
      const anns = [
        annotationWithUser('johnsmith'),
        annotationWithUser('jamesdean'),
        annotationWithUser('johnjones'),
      ];
      const result = filterAnnotations(anns, userQuery('john'));

      assert.deepEqual(result, [anns[0], anns[2]]);
    });

    it("matches user's display name if present", () => {
      const anns = [
        // Users with display names set.
        annotationWithUser('jsmith', 'John Smith'),
        annotationWithUser('jdean', 'James Dean'),
        annotationWithUser('jherriot', 'James Herriot'),
        annotationWithUser('jadejames', 'Jade'),

        // User with no display name.
        annotationWithUser('fmercury'),

        // Annotation with no extended user info.
        { id: 100, user: 'acct:jim@example.com' },
      ];
      const result = filterAnnotations(anns, userQuery('james'));

      assert.deepEqual(result, [anns[1], anns[2], anns[3]]);
    });

    it('matches username and display name independently', () => {
      const anns = [annotationWithUser('dean31', 'James Dean')];
      const result = filterAnnotations(anns, userQuery('dean31 james'));
      assert.equal(result.length, 0);
    });

    it('ignores display name if not set', () => {
      const anns = [annotationWithUser('msmith')];
      const result = filterAnnotations(anns, userQuery('null'));
      assert.deepEqual(result, []);
    });
  });

  describe('"since" field', () => {
    it('matches if the annotation is newer than the query', () => {
      const annotation = {
        id: 1,
        updated: isoDateWithAge(50),
        target: [{}],
      };
      const filters = {
        since: { terms: [100], operator: 'and' },
      };

      const result = filterAnnotations([annotation], filters);

      assert.deepEqual(result, [annotation]);
    });

    it('does not match if the annotation is older than the query', () => {
      const annotation = {
        id: 1,
        updated: isoDateWithAge(150),
        target: [{}],
      };
      const filters = {
        since: { terms: [100], operator: 'and' },
      };

      const result = filterAnnotations([annotation], filters);

      assert.deepEqual(result, []);
    });
  });

  describe('"page" field', () => {
    const annotation = {
      id: 1,
      target: [
        {
          selector: [
            {
              type: 'PageSelector',
              index: 4,
              label: '5',
            },
          ],
        },
      ],
    };

    it('matches if annotation is in page range', () => {
      const filters = { page: { terms: ['4-6'], operator: 'or' } };
      const result = filterAnnotations([annotation], filters);
      assert.deepEqual(result, [annotation]);
    });

    it('does not match if annotation is outside of page range', () => {
      const filters = { page: { terms: ['6-8'], operator: 'or' } };
      const result = filterAnnotations([annotation], filters);
      assert.deepEqual(result, []);
    });
  });

  describe('"cfi" field', () => {
    const annotation = {
      id: 1,
      target: [
        {
          selector: [
            {
              type: 'EPUBContentSelector',
              cfi: '/2/4',
            },
          ],
        },
      ],
    };

    [
      '/2/2-/2/6',
      // CFI containing assertions in square brackets. Hyphens inside assertions
      // should be ignored.
      '/2/2[-/2/2]-/2/6',
    ].forEach(range => {
      it('matches if annotation is in range', () => {
        const filters = { cfi: { terms: [range], operator: 'or' } };
        const result = filterAnnotations([annotation], filters);
        assert.deepEqual(result, [annotation]);
      });
    });

    it('does not match if annotation is outside of range', () => {
      const filters = { cfi: { terms: ['/2/6-/2/8'], operator: 'or' } };
      const result = filterAnnotations([annotation], filters);
      assert.deepEqual(result, []);
    });

    ['/2/2', '/2/2[-/2/6]'].forEach(range => {
      it('does not match if term is not a range', () => {
        const filters = { cfi: { terms: [range], operator: 'or' } };
        const result = filterAnnotations([annotation], filters);
        assert.deepEqual(result, []);
      });
    });
  });

  describe('"quote" field', () => {
    const emptyAnnotation = { id: 42, target: [{}] };

    it('matches target text quote', () => {
      const annotation = {
        id: 1,
        target: [
          {
            selector: [
              {
                type: 'TextQuoteSelector',
                exact: 'foobar',
              },
            ],
          },
        ],
      };
      const filters = { quote: { terms: ['foo'], operator: 'or' } };
      const result = filterAnnotations([annotation, emptyAnnotation], filters);
      assert.deepEqual(result, [annotation]);
    });

    it('matches target description', () => {
      const annotation = {
        id: 1,
        target: [
          {
            description: 'a widget',
          },
        ],
      };
      const filters = { quote: { terms: ['widget'], operator: 'or' } };
      const result = filterAnnotations([annotation, emptyAnnotation], filters);
      assert.deepEqual(result, [annotation]);
    });
  });

  it('ignores filters with no terms in the query', () => {
    const annotation = {
      id: 1,
      tags: ['foo'],
      target: [{}],
      text: '',
      url: 'https://example.com',
    };
    const filters = {
      any: {
        terms: ['foo'],
        operator: 'and',
      },
      tag: {
        terms: [],
        operator: 'and',
      },
    };

    const result = filterAnnotations([annotation], filters);

    assert.deepEqual(result, [annotation]);
  });

  it('can match annotations (drafts) with no id', () => {
    const annotation = {
      tags: ['foo'],
      target: [{}],
      text: '',
      url: 'https://example.com',
    };
    const filters = {
      any: {
        terms: ['foo'],
        operator: 'and',
      },
    };

    const result = filterAnnotations([annotation], filters);

    assert.deepEqual(result, [annotation]);
  });
});
