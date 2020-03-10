import * as threadUtil from '../thread';

describe('sidebar/util/thread', () => {
  const fakeThread = () => {
    return {
      annotation: {},
      visible: true,
      children: [
        {
          annotation: {},
          visible: true,
          children: [
            { annotation: {}, visible: true, children: [] },
            { annotation: {}, visible: false, children: [] },
          ],
        },
        {
          annotation: {},
          visible: false,
          children: [{ annotation: {}, visible: true, children: [] }],
        },
        { annotation: {}, visible: true, children: [] },
      ],
    };
  };

  describe('countVisible', () => {
    it('should count the number of visible entries in the thread', () => {
      const thread = fakeThread();
      assert.equal(threadUtil.countVisible(thread), 5);
    });

    it('should calculate visible entries when top-level thread is hidden', () => {
      const thread = fakeThread();
      thread.visible = false;

      assert.equal(threadUtil.countVisible(thread), 4);
    });
  });

  describe('countHidden', () => {
    it('should count the number of hidden entries in the thread', () => {
      const thread = fakeThread();
      assert.equal(threadUtil.countHidden(thread), 2);
    });

    it('should calculate visible entries when top-level thread is hidden', () => {
      const thread = fakeThread();
      thread.visible = false;

      assert.equal(threadUtil.countHidden(thread), 3);
    });
  });
});
