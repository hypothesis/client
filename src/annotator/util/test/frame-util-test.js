'use strict';

const frameUtil = require('../frame-util');

describe('frameUtil', function () {
  describe('findFrames', function () {

    let container;

    const _addFrameToContainer = (options={})=>{
      const frame = document.createElement('iframe');
      frame.className = options.className || '';
      frame.style.height = `${(options.height || 150)}px`;
      frame.style.width = `${(options.width || 150)}px`;
      container.appendChild(frame);
      return frame;
    };

    beforeEach(function () {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(function () {
      container.remove();
    });

    it('should find valid frames', function () {

      let foundFrames = frameUtil.findFrames(container);

      assert.lengthOf(foundFrames, 0, 'no frames appended so none should be found');

      const frame1 = _addFrameToContainer();
      const frame2 = _addFrameToContainer();

      foundFrames = frameUtil.findFrames(container);

      assert.deepEqual(foundFrames, [frame1, frame2], 'appended frames should be found');
    });

    it('should not find small frames', function () {

      // add frames that are small in both demensions
      _addFrameToContainer({width: 140});
      _addFrameToContainer({height: 140});

      const foundFrames = frameUtil.findFrames(container);

      assert.lengthOf(foundFrames, 0, 'frames with small demensions should not be found');
    });

    it('should not find hypothesis frames', function () {

      _addFrameToContainer({className: 'h-sidebar-iframe other-class-too'});

      const foundFrames = frameUtil.findFrames(container);

      assert.lengthOf(foundFrames, 0, 'frames with hypothesis className should not be found');
    });
  });
});
