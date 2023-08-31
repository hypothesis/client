import { annotationsByUser } from '../annotations-by-user';

describe('annotationsByUser', () => {
  const annotations = [
    {
      id: 'abc',
      user: 'acct:john@example.com',
      text: 'Test annotation',
    },
    {
      id: 'def',
      user: 'acct:brian@example.com',
      text: 'Test annotation',
    },
    {
      id: 'xyz',
      user: 'acct:brian@example.com',
      text: 'Test annotation',
      references: ['abc'],
    },
  ];

  it('groups annotations by user and result is sorted', () => {
    const getDisplayName = ann => ann.user;
    const [first, second, ...rest] = annotationsByUser({
      annotations,
      getDisplayName,
    });

    // It should only return the first two users
    assert.equal(rest.length, 0);

    assert.deepEqual(first, {
      userid: 'acct:brian@example.com',
      displayName: 'acct:brian@example.com',
      annotations: [
        {
          id: 'def',
          user: 'acct:brian@example.com',
          text: 'Test annotation',
        },
        {
          id: 'xyz',
          user: 'acct:brian@example.com',
          text: 'Test annotation',
          references: ['abc'],
        },
      ],
    });
    assert.deepEqual(second, {
      userid: 'acct:john@example.com',
      displayName: 'acct:john@example.com',
      annotations: [
        {
          id: 'abc',
          user: 'acct:john@example.com',
          text: 'Test annotation',
        },
      ],
    });
  });

  it('allows replies to be excluded', () => {
    const getDisplayName = ann => ann.user;
    const [first, second, ...rest] = annotationsByUser({
      annotations,
      getDisplayName,
      excludeReplies: true,
    });

    // It should only return the first two users
    assert.equal(rest.length, 0);

    assert.deepEqual(first, {
      userid: 'acct:brian@example.com',
      displayName: 'acct:brian@example.com',
      annotations: [
        {
          id: 'def',
          user: 'acct:brian@example.com',
          text: 'Test annotation',
        },
      ],
    });
    assert.deepEqual(second, {
      userid: 'acct:john@example.com',
      displayName: 'acct:john@example.com',
      annotations: [
        {
          id: 'abc',
          user: 'acct:john@example.com',
          text: 'Test annotation',
        },
      ],
    });
  });
});
