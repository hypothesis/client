import { frameFillsAncestor } from '../frame';

describe('annotator/util/frame', () => {
  let frames;

  function createFrame() {
    const frame = document.createElement('iframe');
    frames.push(frame);

    document.body.append(frame);

    return frame;
  }

  beforeEach(() => {
    frames = [];
  });

  afterEach(() => {
    frames.forEach(f => f.remove());
  });

  describe('frameFillsAncestor', () => {
    it('returns true if both frames are the same', () => {
      assert.isTrue(frameFillsAncestor(window, window));
    });

    it('returns false if ancestor is not direct parent of frame', () => {
      const child = createFrame();
      assert.isFalse(frameFillsAncestor(child.contentWindow, window.parent));
    });

    it('returns true if frame fills parent', () => {
      const child = createFrame();
      child.style.width = `${window.innerWidth}px`;
      assert.isTrue(frameFillsAncestor(child.contentWindow, window));
    });

    it('returns false if frame does not fill parent', () => {
      const child = createFrame();
      child.style.width = `${window.innerWidth * 0.5}px`;
      assert.isFalse(frameFillsAncestor(child.contentWindow, window));
    });

    it('returns false if frames are not same-origin', () => {
      const child = createFrame();

      // Simulate cross-origin parent
      Object.defineProperty(child.contentWindow, 'frameElement', {
        value: null,
      });

      assert.isFalse(frameFillsAncestor(child.contentWindow, window));
    });
  });
});
