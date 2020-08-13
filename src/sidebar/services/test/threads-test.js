import threadsService from '../threads';

const NESTED_THREADS = {
  id: 'top',
  annotation: { $tag: 'top-tag' },
  children: [
    {
      id: '1',
      annotation: { $tag: '1-tag' },
      children: [
        {
          id: '1a',
          annotation: { $tag: '1a-tag' },
          children: [
            { annotation: { $tag: '1ai-tag' }, id: '1ai', children: [] },
          ],
        },
        {
          id: '1b',
          annotation: { $tag: '1b-tag' },
          children: [],
          visible: true,
        },
        {
          id: '1c',
          annotation: { $tag: '1c-tag' },
          children: [
            {
              id: '1ci',
              annotation: { $tag: '1ci-tag' },
              children: [],
              visible: false,
            },
          ],
        },
      ],
    },
    {
      id: '2',
      annotation: { $tag: '2-tag' },
      children: [
        { id: '2a', annotation: { $tag: '2a-tag' }, children: [] },
        {
          id: '2b',
          children: [
            {
              id: '2bi',
              annotation: { $tag: '2bi-tag' },
              children: [],
              visible: true,
            },
            { id: '2bii', annotation: { $tag: '2bii-tag' }, children: [] },
          ],
        },
      ],
    },
    {
      id: '3',
      annotation: { $tag: '3-tag' },
      children: [],
    },
  ],
};

describe('threadsService', function () {
  let fakeStore;
  let service;

  beforeEach(() => {
    fakeStore = {
      setForcedVisible: sinon.stub(),
    };
    service = threadsService(fakeStore);
  });

  describe('#forceVisible', () => {
    let nonVisibleThreadIds;
    beforeEach(() => {
      nonVisibleThreadIds = [
        'top-tag',
        '1-tag',
        '2-tag',
        '3-tag',
        '1a-tag',
        '1c-tag',
        '2a-tag',
        //'2b-tag',  Not visible, but also does not have an annotation
        '1ai-tag',
        '1ci-tag',
        '2bii-tag',
      ];
    });
    it('should set the thread and its children force-visible in the store', () => {
      service.forceVisible(NESTED_THREADS);
      nonVisibleThreadIds.forEach(threadId => {
        assert.calledWith(fakeStore.setForcedVisible, threadId);
        assert.callCount(
          fakeStore.setForcedVisible,
          nonVisibleThreadIds.length
        );
      });
    });

    it('should not set the visibility on thread ancestors', () => {
      // This starts at the level with `id` of '1'
      service.forceVisible(NESTED_THREADS.children[0]);

      const calledWithThreadIds = [];
      for (let i = 0; i < fakeStore.setForcedVisible.callCount; i++) {
        calledWithThreadIds.push(fakeStore.setForcedVisible.getCall(i).args[0]);
      }
      assert.deepEqual(calledWithThreadIds, [
        '1ai-tag',
        '1a-tag',
        '1ci-tag',
        '1c-tag',
        '1-tag',
      ]);
    });
  });
});
