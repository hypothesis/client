import { findFrames } from '../frame-observer';

describe('findFrames', () => {
  let container;

  const _addFrameToContainer = () => {
    const frame = document.createElement('iframe');
    frame.setAttribute('enable-annotation', '');
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
    let foundFrames = findFrames(container);

    assert.deepEqual(foundFrames, []);

    const frame1 = _addFrameToContainer();
    const frame2 = _addFrameToContainer();
    foundFrames = findFrames(container);

    assert.deepEqual(foundFrames, [frame1, frame2]);
  });

  it('should not return frames that have not opted into annotation', () => {
    const frame = _addFrameToContainer();

    frame.removeAttribute('enable-annotation');
    const foundFrames = findFrames(container);

    assert.deepEqual(foundFrames, []);
  });
});
