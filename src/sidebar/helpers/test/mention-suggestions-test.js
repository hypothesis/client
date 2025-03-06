import { combineUsersForMentions } from '../mention-suggestions';

describe('combineUsersForMentions', () => {
  [{ focusedGroupMembers: null }, { focusedGroupMembers: 'loading' }].forEach(
    ({ focusedGroupMembers }) => {
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
        username: 'janedoe',
        displayName: 'Jane Doe',
      },
      {
        username: 'cecilia92',
        displayName: 'Cecelia Davenport',
      },
    ];
    const focusedGroupMembers = [
      {
        username: 'janedoe',
        display_name: 'Jane Doe',
      },
      {
        username: 'albert',
        display_name: 'Albert Banana',
      },
    ];

    assert.deepEqual(
      combineUsersForMentions(usersWhoAnnotated, focusedGroupMembers),
      {
        status: 'loaded',
        users: [
          {
            username: 'albert',
            displayName: 'Albert Banana',
          },
          {
            username: 'cecilia92',
            displayName: 'Cecelia Davenport',
          },
          {
            username: 'janedoe',
            displayName: 'Jane Doe',
          },
        ],
      },
    );
  });
});
