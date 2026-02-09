import { mount } from '@hypothesis/frontend-testing';

import DrawToolKeyboardIndicator from '../DrawToolKeyboardIndicator';

describe('DrawToolKeyboardIndicator', () => {
  it('returns null when keyboard is not active', () => {
    const wrapper = mount(
      <DrawToolKeyboardIndicator mode="move" keyboardActive={false} />,
    );
    assert.equal(
      wrapper.find('[data-testid="draw-tool-keyboard-indicator"]').length,
      0,
    );
  });

  it('returns null when mode is null', () => {
    const wrapper = mount(
      <DrawToolKeyboardIndicator mode={null} keyboardActive={true} />,
    );
    assert.equal(
      wrapper.find('[data-testid="draw-tool-keyboard-indicator"]').length,
      0,
    );
  });

  it('shows Move mode and move instructions when mode is move', () => {
    const wrapper = mount(
      <DrawToolKeyboardIndicator mode="move" keyboardActive={true} />,
    );
    const text = wrapper
      .find('[data-testid="draw-tool-keyboard-indicator"]')
      .text();
    assert.include(text, 'Keyboard mode: Move');
    assert.include(text, 'Use arrow keys to move');
    assert.include(text, 'Enter to confirm');
  });

  it('shows Resize mode and resize instructions with pinned corner', () => {
    const wrapper = mount(
      <DrawToolKeyboardIndicator
        mode="resize"
        keyboardActive={true}
        pinnedCorner="top-right"
      />,
    );
    const text = wrapper
      .find('[data-testid="draw-tool-keyboard-indicator"]')
      .text();
    assert.include(text, 'Keyboard mode: Resize');
    assert.include(text, 'top-right corner pinned');
    assert.include(text, 'Tab to change corner');
  });

  it('shows Rectangle mode and switch instructions when mode is rect', () => {
    const wrapper = mount(
      <DrawToolKeyboardIndicator mode="rect" keyboardActive={true} />,
    );
    const text = wrapper
      .find('[data-testid="draw-tool-keyboard-indicator"]')
      .text();
    assert.include(text, 'Keyboard mode: Rectangle');
    assert.include(text, 'Click the mode button to switch to Move or Resize');
  });

  it('uses default corner label when pinnedCorner not provided in resize mode', () => {
    const wrapper = mount(
      <DrawToolKeyboardIndicator mode="resize" keyboardActive={true} />,
    );
    const text = wrapper
      .find('[data-testid="draw-tool-keyboard-indicator"]')
      .text();
    assert.include(text, 'top-left corner pinned');
  });
});
