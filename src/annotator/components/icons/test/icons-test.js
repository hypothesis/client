import { mount } from '@hypothesis/frontend-testing';

import MoveModeIcon from '../MoveModeIcon';
import ResizeModeIcon from '../ResizeModeIcon';

describe('annotator/components/icons', () => {
  describe('MoveModeIcon', () => {
    it('renders an SVG with viewBox 0 0 16 16', () => {
      const wrapper = mount(<MoveModeIcon />);
      const svg = wrapper.find('svg');
      assert.equal(svg.length, 1);
      assert.equal(svg.prop('viewBox'), '0 0 16 16');
      assert.equal(svg.prop('width'), '16');
      assert.equal(svg.prop('height'), '16');
      assert.equal(svg.prop('aria-hidden'), 'true');
    });

    it('renders multiple path elements for frame and arrows', () => {
      const wrapper = mount(<MoveModeIcon />);
      const paths = wrapper.find('path');
      assert.isTrue(paths.length >= 2);
    });
  });

  describe('ResizeModeIcon', () => {
    it('renders an SVG with viewBox 0 0 16 16', () => {
      const wrapper = mount(<ResizeModeIcon />);
      const svg = wrapper.find('svg');
      assert.equal(svg.length, 1);
      assert.equal(svg.prop('viewBox'), '0 0 16 16');
      assert.equal(svg.prop('width'), '16');
      assert.equal(svg.prop('height'), '16');
      assert.equal(svg.prop('aria-hidden'), 'true');
    });

    it('renders multiple path elements for frame and arrows', () => {
      const wrapper = mount(<ResizeModeIcon />);
      const paths = wrapper.find('path');
      assert.isTrue(paths.length >= 2);
    });
  });
});
