import {
  combineUsersForMentions,
  usersMatchingMention,
} from '../mention-suggestions';

describe('combineUsersForMentions', () => {
  [{ status: 'not-loaded' }, { status: 'loading' }].forEach(
    focusedGroupMembers => {
      it('returns "loading" status if focused group members are not loaded yet', () => {
        assert.deepEqual(
          combineUsersForMentions({
            usersWhoAnnotated: [],
            usersWhoWereMentioned: [],
            focusedGroupMembers,
          }),
          {
            status: 'loading',
          },
        );
      });
    },
  );

  it('merges and dedups users who already annotated, mentioned users and group members', () => {
    const usersWhoAnnotated = [
      {
        userid: 'acct:janedoe@example.com',
        username: 'janedoe',
        displayName: 'Jane Doe',
      },
      {
        userid: 'acct:cecelia92@example.com',
        username: 'cecelia92',
        displayName: 'Cecelia Davenport',
      },
    ];
    const usersWhoWereMentioned = [
      {
        userid: 'acct:johndoe@example.com',
        username: 'johndoe',
        displayName: 'John Doe',
      },
      {
        userid: 'acct:cecelia92@example.com',
        username: 'cecelia92',
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
      combineUsersForMentions({
        usersWhoAnnotated,
        usersWhoWereMentioned,
        focusedGroupMembers,
        mentionMode: 'username',
      }),
      {
        status: 'loaded',
        users: [
          {
            userid: 'acct:albert@example.com',
            username: 'albert',
            displayName: 'Albert Banana',
          },
          {
            userid: 'acct:cecelia92@example.com',
            username: 'cecelia92',
            displayName: 'Cecelia Davenport',
          },
          {
            userid: 'acct:janedoe@example.com',
            username: 'janedoe',
            displayName: 'Jane Doe',
          },
          {
            userid: 'acct:johndoe@example.com',
            username: 'johndoe',
            displayName: 'John Doe',
          },
        ],
      },
    );
  });

  [
    {
      mentionMode: 'username',
      expectedUsers: [
        {
          userid: 'acct:accent@example.com',
          username: 'accent',
          displayName: 'á',
        },
        {
          userid: 'acct:cecelia1@example.com',
          username: 'cecelia1',
          displayName: 'Cecelia Davenport',
        },
        {
          userid: 'acct:cecelia92@example.com',
          username: 'cecelia92',
          displayName: 'Cecelia Davenport',
        },
        {
          userid: 'acct:no_accent@example.com',
          username: 'no_accent',
          displayName: 'a',
        },
      ],
    },
    {
      mentionMode: 'display-name',
      expectedUsers: [
        {
          userid: 'acct:accent@example.com',
          username: 'accent',
          displayName: 'á',
        },
        {
          userid: 'acct:no_accent@example.com',
          username: 'no_accent',
          displayName: 'a',
        },
        {
          userid: 'acct:cecelia1@example.com',
          username: 'cecelia1',
          displayName: 'Cecelia Davenport',
        },
        {
          userid: 'acct:cecelia92@example.com',
          username: 'cecelia92',
          displayName: 'Cecelia Davenport',
        },
      ],
    },
  ].forEach(({ mentionMode, expectedUsers }) => {
    it('sorts users differently based on mention mode', () => {
      const usersWhoAnnotated = [
        {
          userid: 'acct:accent@example.com',
          username: 'accent',
          displayName: 'á',
        },
        {
          userid: 'acct:no_accent@example.com',
          username: 'no_accent',
          displayName: 'a',
        },
        {
          userid: 'acct:cecelia92@example.com',
          username: 'cecelia92',
          displayName: 'Cecelia Davenport',
        },
        {
          userid: 'acct:cecelia1@example.com',
          username: 'cecelia1',
          displayName: 'Cecelia Davenport',
        },
      ];
      assert.deepEqual(
        combineUsersForMentions({
          usersWhoAnnotated,
          usersWhoWereMentioned: [],
          focusedGroupMembers: { status: 'loaded', members: [] },
          mentionMode,
        }),
        {
          status: 'loaded',
          users: expectedUsers,
        },
      );
    });
  });
});

describe('usersMatchingMention', () => {
  [
    // With no users, there won't be any suggestions regardless of the mention
    {
      usersForMentions: { status: 'loaded', users: [] },
      mention: '',
      options: { mentionMode: 'username' },
      expectedSuggestions: [],
    },
    {
      usersForMentions: { status: 'loading' },
      mention: '',
      options: { mentionMode: 'username' },
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
      options: { mentionMode: 'username' },
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
      options: { mentionMode: 'username' },
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
      options: { mentionMode: 'username' },
      expectedSuggestions: [
        {
          userid: 'acct:two@example.com',
          username: 'two',
          displayName: 'johndoe',
        },
      ],
    },

    // Matching is case-insensitive
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
      mention: 'JohnDoe',
      options: { mentionMode: 'username' },
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
      options: { mentionMode: 'username' },
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
      options: { maxUsers: 2, mentionMode: 'username' },
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

    // Matching in display-name mode ignores usernames
    {
      usersForMentions: {
        status: 'loaded',
        users: [
          {
            userid: 'acct:one@example.com',
            username: 'foo', // This won't match
            displayName: 'johndoe',
          },
          {
            userid: 'acct:two@example.com',
            username: 'two',
            displayName: 'Foo One',
          },
          {
            userid: 'acct:three@example.com',
            username: 'jane',
            displayName: 'Jane "foo" Doe',
          },
        ],
      },
      mention: 'foo',
      options: { mentionMode: 'display-name' },
      expectedSuggestions: [
        {
          userid: 'acct:two@example.com',
          username: 'two',
          displayName: 'Foo One',
        },
        {
          userid: 'acct:three@example.com',
          username: 'jane',
          displayName: 'Jane "foo" Doe',
        },
      ],
    },
  ].forEach(({ usersForMentions, mention, options, expectedSuggestions }) => {
    it('suggests expected users for mention', () => {
      assert.deepEqual(
        usersMatchingMention(mention, usersForMentions, options),
        expectedSuggestions,
      );
    });
  });
});
