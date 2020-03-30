import threadsService from '../threads';

const NESTED_THREADS = {
  id: 'top',
  children: [
    {
      id: '1',
      children: [
        { id: '1a', children: [{ id: '1ai', children: [] }] },
        { id: '1b', children: [] },
        {
          id: '1c',
          children: [{ id: '1ci', children: [] }],
        },
      ],
    },
    {
      id: '2',
      children: [
        { id: '2a', children: [] },
        {
          id: '2b',
          children: [
            { id: '2bi', children: [] },
            { id: '2bii', children: [] },
          ],
        },
      ],
    },
    {
      id: '3',
      children: [],
    },
  ],
};

describe('threadsService', function () {
  let fakeStore;
  let service;

  beforeEach(() => {
    fakeStore = {
      setForceVisible: sinon.stub(),
    };
    service = threadsService(fakeStore);
  });

  describe('#forceVisible', () => {
    it('should set the thread and its children force-visible in the store', () => {
      service.forceVisible(NESTED_THREADS);

      [
        'top',
        '1',
        '2',
        '3',
        '1a',
        '1b',
        '1c',
        '2a',
        '2b',
        '1ai',
        '1ci',
        '2bi',
        '2bii',
      ].forEach(threadId =>
        assert.calledWith(fakeStore.setForceVisible, threadId)
      );
    });

    it('should not set the visibility on thread ancestors', () => {
      // This starts at the level with `id` of '1'
      service.forceVisible(NESTED_THREADS.children[0]);

      const calledWithThreadIds = [];
      for (let i = 0; i < fakeStore.setForceVisible.callCount; i++) {
        calledWithThreadIds.push(fakeStore.setForceVisible.getCall(i).args[0]);
      }
      assert.deepEqual(calledWithThreadIds, [
        '1ai',
        '1a',
        '1b',
        '1ci',
        '1c',
        '1',
      ]);
    });
  });
});
