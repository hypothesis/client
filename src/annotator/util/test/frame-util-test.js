'use strict';

const frameUtil = require('../frame-util');

describe('annotator.util.frame-util', function() {
  describe('findFrames', function() {
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

    beforeEach(function() {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(function() {
      container.remove();
    });

    it('should return valid frames', function() {
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

    it('should not return the Hypothesis sidebar', function() {
      _addFrameToContainer({ className: 'h-sidebar-iframe other-class-too' });

      const foundFrames = frameUtil.findFrames(container);

      assert.lengthOf(
        foundFrames,
        0,
        'frames with hypothesis className should not be found'
      );
    });
  });
});
