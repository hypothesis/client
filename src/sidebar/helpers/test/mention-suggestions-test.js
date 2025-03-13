import {
  combineUsersForMentions,
  usersMatchingMention,
} from '../mention-suggestions';

describe('combineUsersForMentions', () => {
  [{ status: 'not-loaded' }, { status: 'loading' }].forEach(
    focusedGroupMembers => {
      it('returns "loading" status if focused group members are not loaded yet', () => {
        assert.deepEqual(combineUsersForMentions([], focusedGroupMembers), {
          status: 'loading',
        });
      });
    },
  );

  it('merges, dedups and sorts users who already annotated with group members', () => {
    const usersWhoAnnotated = [
      {
        userid: 'acct:janedoe@example.com',
        username: 'janedoe',
        displayName: 'Jane Doe',
      },
      {
        userid: 'acct:cecilia92@example.com',
        username: 'cecilia92',
        displayName: 'Cecelia Davenport',
      },
    ];
    const focusedGroupMembers = {
      status: 'loaded',
      members: [
        {
          userid: 'acct:janedoe@example.com',
          username: 'janedoe',
          display_name: 'Jane Doe',
        },
        {
          userid: 'acct:albert@example.com',
          username: 'albert',
          display_name: 'Albert Banana',
        },
      ],
    };

    assert.deepEqual(
      combineUsersForMentions(usersWhoAnnotated, focusedGroupMembers),
      {
        status: 'loaded',
        users: [
          {
            userid: 'acct:albert@example.com',
            username: 'albert',
            displayName: 'Albert Banana',
          },
          {
            userid: 'acct:cecilia92@example.com',
            username: 'cecilia92',
            displayName: 'Cecelia Davenport',
          },
          {
            userid: 'acct:janedoe@example.com',
            username: 'janedoe',
            displayName: 'Jane Doe',
          },
        ],
      },
    );
  });
});

describe('usersMatchingMention', () => {
  [
    // With no users, there won't be any suggestions regardless of the mention
    {
      usersForMentions: { status: 'loaded', users: [] },
      mention: '',
      expectedSuggestions: [],
    },
    {
      usersForMentions: { status: 'loading' },
      mention: '',
      expectedSuggestions: [],
    },

    // With users, there won't be suggestions when none of them matches the
    // mention
    {
      usersForMentions: {
        status: 'loaded',
        users: [
          {
            userid: 'acct:one@example.com',
            username: 'one',
            displayName: 'johndoe',
          },
          {
            userid: 'acct:two@example.com',
            username: 'two',
            displayName: 'johndoe',
          },
          {
            userid: 'acct:three@example.com',
            username: 'three',
            displayName: 'johndoe',
          },
        ],
      },
      mention: 'nothing_will_match',
      expectedSuggestions: [],
    },

    // With users, there won't be suggestions when the mention is undefined
    {
      usersForMentions: {
        status: 'loaded',
        users: [
          {
            userid: 'acct:one@example.com',
            username: 'one',
            displayName: 'johndoe',
          },
          {
            userid: 'acct:two@example.com',
            username: 'two',
            displayName: 'johndoe',
          },
          {
            userid: 'acct:three@example.com',
            username: 'three',
            displayName: 'johndoe',
          },
        ],
      },
      mention: undefined,
      expectedSuggestions: [],
    },

    // With users, there will be suggestions when any of them matches the
    // mention
    {
      usersForMentions: {
        status: 'loaded',
        users: [
          {
            userid: 'acct:one@example.com',
            username: 'one',
            displayName: 'johndoe',
          },
          {
            userid: 'acct:two@example.com',
            username: 'two',
            displayName: 'johndoe',
          },
          {
            userid: 'acct:three@example.com',
            username: 'three',
            displayName: 'johndoe',
          },
        ],
      },
      mention: 'two',
      expectedSuggestions: [
        {
          userid: 'acct:two@example.com',
          username: 'two',
          displayName: 'johndoe',
        },
      ],
    },
    {
      usersForMentions: {
        status: 'loaded',
        users: [
          {
            userid: 'acct:one@example.com',
            username: 'one',
            displayName: 'johndoe',
          },
          {
            userid: 'acct:two@example.com',
            username: 'two',
            displayName: 'johndoe',
          },
          {
            userid: 'acct:three@example.com',
            username: 'three',
            displayName: 'johndoe',
          },
        ],
      },
      mention: 'johndoe',
      expectedSuggestions: [
        {
          userid: 'acct:one@example.com',
          username: 'one',
          displayName: 'johndoe',
        },
        {
          userid: 'acct:two@example.com',
          username: 'two',
          displayName: 'johndoe',
        },
        {
          userid: 'acct:three@example.com',
          username: 'three',
          displayName: 'johndoe',
        },
      ],
    },

    // With users, all users will match empty mention
    {
      usersForMentions: {
        status: 'loaded',
        users: [
          {
            userid: 'acct:one@example.com',
            username: 'one',
            displayName: 'johndoe',
          },
          {
            userid: 'acct:two@example.com',
            username: 'two',
            displayName: 'johndoe',
          },
          {
            userid: 'acct:three@example.com',
            username: 'three',
            displayName: 'johndoe',
          },
        ],
      },
      mention: '',
      expectedSuggestions: [
        {
          userid: 'acct:one@example.com',
          username: 'one',
          displayName: 'johndoe',
        },
        {
          userid: 'acct:two@example.com',
          username: 'two',
          displayName: 'johndoe',
        },
        {
          userid: 'acct:three@example.com',
          username: 'three',
          displayName: 'johndoe',
        },
      ],
    },

    // Matching users are cropped to a maximum
    {
      usersForMentions: {
        status: 'loaded',
        users: [
          {
            userid: 'acct:one@example.com',
            username: 'one',
            displayName: 'johndoe',
          },
          {
            userid: 'acct:two@example.com',
            username: 'two',
            displayName: 'johndoe',
          },
          {
            userid: 'acct:three@example.com',
            username: 'three',
            displayName: 'johndoe',
          },
        ],
      },
      mention: 'johndoe',
      options: { maxUsers: 2 },
      expectedSuggestions: [
        {
          userid: 'acct:one@example.com',
          username: 'one',
          displayName: 'johndoe',
        },
        {
          userid: 'acct:two@example.com',
          username: 'two',
          displayName: 'johndoe',
        },
      ],
    },
  ].forEach(({ usersForMentions, mention, expectedSuggestions, options }) => {
    it('suggests expected users for mention', () => {
      assert.deepEqual(
        usersMatchingMention(mention, usersForMentions, options),
        expectedSuggestions,
      );
    });
  });
});
