import * as frameUtil from '../frame-util';

describe('annotator/util/frame-util', () => {
  describe('findFrames', () => {
    let container;

    const _addFrameToContainer = (options = {}) => {
      const frame = document.createElement('iframe');
      frame.setAttribute('enable-annotation', '');
      frame.className = options.className || '';
      frame.style.height = `${options.height || 150}px`;
      frame.style.width = `${options.width || 150}px`;
      container.appendChild(frame);
      return frame;
    };

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      container.remove();
    });

    it('should return valid frames', () => {
      let foundFrames = frameUtil.findFrames(container);

      assert.lengthOf(
        foundFrames,
        0,
        'no frames appended so none should be found'
      );

      const frame1 = _addFrameToContainer();
      const frame2 = _addFrameToContainer();

      foundFrames = frameUtil.findFrames(container);

      assert.deepEqual(
        foundFrames,
        [frame1, frame2],
        'appended frames should be found'
      );
    });

    it('should not return frames that have not opted into annotation', () => {
      const frame = _addFrameToContainer();

      frame.removeAttribute('enable-annotation');

      const foundFrames = frameUtil.findFrames(container);
      assert.lengthOf(foundFrames, 0);
    });
  });
});
