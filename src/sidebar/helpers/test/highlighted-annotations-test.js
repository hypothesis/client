import { mostRelevantAnnotation } from '../highlighted-annotations';

describe('mostRelevantAnnotation', () => {
  const annotations = [
    { id: 't1', updated: '2024-01-01T10:42:00' },
    { id: 't2', updated: '2024-01-02T10:42:00' },
    { id: 't3', updated: '2024-01-03T10:42:00' },
    { id: 't4', updated: '2024-01-03T10:42:00' }, // Same date as previous one
  ];

  it('returns `null` if no highlighted annotations are provided', () => {
    assert.isNull(
      mostRelevantAnnotation(annotations, {
        highlightedAnnotations: [],
        currentUserId: '',
      }),
    );
  });

  [
    {
      highlightedAnnotations: annotations.map(({ id }) => id),
      // Last and previous to last one have the same updated date, so they'll
      // keep the same order on the list, and the thord one will match
      expectedResult: annotations[2],
    },
    {
      highlightedAnnotations: ['t1', 't3'],
      expectedResult: annotations[2],
    },
    {
      highlightedAnnotations: ['t2', 't1'],
      expectedResult: annotations[1],
    },
    {
      highlightedAnnotations: ['t2'],
      expectedResult: annotations[1],
    },
    {
      highlightedAnnotations: ['t2', 't4'],
      expectedResult: annotations[3],
    },
  ].forEach(({ highlightedAnnotations, expectedResult }) => {
    it('returns most recent highlighted annotation if currentUserId is `null`', () => {
      assert.deepEqual(
        mostRelevantAnnotation(annotations, {
          highlightedAnnotations,
          currentUserId: null,
        }),
        expectedResult,
      );
    });
  });

  [
    {
      annosWithCurrentUserMention: ['t1'],
      expectedResult: annotations[0],
    },
    {
      annosWithCurrentUserMention: ['t2'],
      expectedResult: annotations[1],
    },
    {
      annosWithCurrentUserMention: ['t3'],
      expectedResult: annotations[2],
    },
    {
      annosWithCurrentUserMention: ['t4'],
      expectedResult: annotations[3],
    },
    {
      annosWithCurrentUserMention: ['t2', 't4'],
      expectedResult: annotations[3],
    },
    {
      annosWithCurrentUserMention: ['t1', 't4'],
      expectedResult: annotations[3],
    },
    {
      annosWithCurrentUserMention: ['t2', 't3'],
      expectedResult: annotations[2],
    },
    {
      annosWithCurrentUserMention: ['t1', 't2', 't3'],
      expectedResult: annotations[2],
    },
    {
      annosWithCurrentUserMention: ['t1', 't2'],
      expectedResult: annotations[1],
    },
  ].forEach(({ annosWithCurrentUserMention, expectedResult }) => {
    it('returns most recent annotation with a mention to current user', () => {
      const currentUserId = 'current_user_id';
      const allAnnotations = annotations.map(({ id, updated }) => {
        const mentions = [];
        if (annosWithCurrentUserMention.includes(id)) {
          mentions.push({ userid: currentUserId });
        }

        return { id, updated, mentions };
      });
      const highlightedAnnotations = annotations.map(({ id }) => id);

      const result = mostRelevantAnnotation(allAnnotations, {
        highlightedAnnotations,
        currentUserId,
      });

      assert.match(result, expectedResult);
    });
  });
});
