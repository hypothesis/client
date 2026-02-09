import { mount } from '@hypothesis/frontend-testing';

import DrawToolAnnouncer from '../DrawToolAnnouncer';

describe('DrawToolAnnouncer', () => {
  it('returns null when keyboard is not active', () => {
    const wrapper = mount(
      <DrawToolAnnouncer
        tool="point"
        mode="move"
        keyboardActive={false}
        x={10}
        y={20}
      />,
    );
    assert.equal(wrapper.find('[data-testid="draw-tool-announcer"]').length, 0);
  });

  it('returns null when tool is null', () => {
    const wrapper = mount(
      <DrawToolAnnouncer
        tool={null}
        mode="move"
        keyboardActive={true}
        x={10}
        y={20}
      />,
    );
    assert.equal(wrapper.find('[data-testid="draw-tool-announcer"]').length, 0);
  });

  describe('point tool', () => {
    it('announces pin position when mode is move and x,y provided', () => {
      const wrapper = mount(
        <DrawToolAnnouncer
          tool="point"
          mode="move"
          keyboardActive={true}
          x={42}
          y={87}
        />,
      );
      const content = wrapper.find('[data-testid="draw-tool-announcer"]').text();
      assert.include(content, 'Pin position: 42, 87');
    });

    it('announces arrow keys message when mode is resize (pin)', () => {
      const wrapper = mount(
        <DrawToolAnnouncer
          tool="point"
          mode="resize"
          keyboardActive={true}
        />,
      );
      const content = wrapper.find('[data-testid="draw-tool-announcer"]').text();
      assert.include(content, 'Use arrow keys to move');
    });

    it('announces Enter to confirm when mode is rect or default', () => {
      const wrapper = mount(
        <DrawToolAnnouncer
          tool="point"
          mode="rect"
          keyboardActive={true}
        />,
      );
      const content = wrapper.find('[data-testid="draw-tool-announcer"]').text();
      assert.include(content, 'Enter to confirm');
    });
  });

  describe('rect tool', () => {
    it('announces rectangle position and size when mode is move', () => {
      const wrapper = mount(
        <DrawToolAnnouncer
          tool="rect"
          mode="move"
          keyboardActive={true}
          x={5}
          y={10}
          width={100}
          height={50}
        />,
      );
      const content = wrapper.find('[data-testid="draw-tool-announcer"]').text();
      assert.include(content, 'Rectangle position: 5, 10');
      assert.include(content, 'Size: 100 by 50 pixels');
    });

    it('announces rectangle size and pinned corner when mode is resize', () => {
      const wrapper = mount(
        <DrawToolAnnouncer
          tool="rect"
          mode="resize"
          keyboardActive={true}
          width={80}
          height={60}
          pinnedCorner="bottom-right"
        />,
      );
      const content = wrapper.find('[data-testid="draw-tool-announcer"]').text();
      assert.include(content, 'Rectangle size: 80 by 60 pixels');
      assert.include(content, 'bottom-right corner pinned');
      assert.include(content, 'Press Tab to change pinned corner');
    });

    it('announces rectangle mode message when mode is rect', () => {
      const wrapper = mount(
        <DrawToolAnnouncer
          tool="rect"
          mode="rect"
          keyboardActive={true}
        />,
      );
      const content = wrapper.find('[data-testid="draw-tool-announcer"]').text();
      assert.include(content, 'Rectangle annotation mode');
      assert.include(content, 'Click the mode button to switch to Move or Resize');
    });

    it('announces move/resize hint for rect when mode is move but dimensions missing', () => {
      const wrapper = mount(
        <DrawToolAnnouncer
          tool="rect"
          mode="move"
          keyboardActive={true}
          x={0}
          y={0}
        />,
      );
      const content = wrapper.find('[data-testid="draw-tool-announcer"]').text();
      assert.include(content, 'Ctrl+Shift+J to resize');
      assert.include(content, 'Enter to confirm');
    });
  });

  it('renders with aria-live and role for screen readers', () => {
    const wrapper = mount(
      <DrawToolAnnouncer
        tool="point"
        mode="move"
        keyboardActive={true}
        x={0}
        y={0}
      />,
    );
    const el = wrapper.find('[data-testid="draw-tool-announcer"]');
    assert.equal(el.prop('aria-live'), 'polite');
    assert.equal(el.prop('role'), 'status');
  });
});
