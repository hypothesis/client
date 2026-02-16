import { mount } from '@hypothesis/frontend-testing';

import { DrawToolSurface } from '../DrawToolSurface';

/** Mount DrawToolSurface inside an SVG so SVG elements render correctly. */
function mountSurface(props) {
  const wrapper = mount(
    <svg>
      <DrawToolSurface {...props} />
    </svg>,
  );
  return wrapper;
}

describe('DrawToolSurface', () => {
  const defaultProps = {
    tool: 'rect',
    waitingForSecondClick: false,
    firstClickPoint: undefined,
    keyboardMode: null,
    keyboardActive: false,
    pinnedCorner: 'top-left',
  };

  it('returns null when shape is undefined', () => {
    const wrapper = mountSurface({ ...defaultProps, shape: undefined });
    assert.equal(wrapper.find('rect').length, 0);
    assert.equal(wrapper.find('circle').length, 0);
  });

  describe('rect shape', () => {
    const rectShape = {
      type: 'rect',
      left: 10,
      top: 20,
      right: 110,
      bottom: 80,
    };

    it('renders two rects and no active edge lines when not in resize mode', () => {
      const wrapper = mountSurface({
        ...defaultProps,
        shape: rectShape,
      });
      assert.equal(wrapper.find('rect').length, 2);
      assert.equal(wrapper.find('line').length, 0);
    });

    it('renders two rects and four active edge lines when in resize mode', () => {
      const wrapper = mountSurface({
        ...defaultProps,
        shape: rectShape,
        keyboardMode: 'resize',
        keyboardActive: true,
        pinnedCorner: 'top-left',
      });
      assert.equal(wrapper.find('rect').length, 2);
      assert.equal(wrapper.find('line').length, 4);
    });

    it('renders circle and two lines when waiting for second click', () => {
      const wrapper = mountSurface({
        ...defaultProps,
        shape: rectShape,
        waitingForSecondClick: true,
        firstClickPoint: { x: 50, y: 50 },
      });
      assert.equal(wrapper.find('circle').length, 1);
      assert.equal(wrapper.find('line').length, 2);
      assert.equal(wrapper.find('rect').length, 0);
    });

    it('renders rect (not two-click indicator) when waitingForSecondClick but no firstClickPoint', () => {
      const wrapper = mountSurface({
        ...defaultProps,
        shape: rectShape,
        waitingForSecondClick: true,
        firstClickPoint: undefined,
      });
      assert.equal(wrapper.find('rect').length, 2);
      assert.equal(wrapper.find('circle').length, 0);
    });

    it('shows active edges for each pinned corner in resize mode', () => {
      const corners = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
      corners.forEach(pinnedCorner => {
        const wrapper = mountSurface({
          ...defaultProps,
          shape: rectShape,
          keyboardMode: 'resize',
          keyboardActive: true,
          pinnedCorner,
        });
        const lines = wrapper.find('line');
        assert.equal(lines.length, 4, `pinnedCorner=${pinnedCorner}`);
      });
    });
  });

  describe('point shape', () => {
    it('renders one circle for point', () => {
      const wrapper = mountSurface({
        ...defaultProps,
        shape: { type: 'point', x: 40, y: 60 },
      });
      assert.equal(wrapper.find('circle').length, 1);
      assert.equal(wrapper.find('rect').length, 0);
    });
  });
});
