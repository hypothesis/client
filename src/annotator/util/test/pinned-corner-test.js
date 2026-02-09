import { pinnedCornerToLabel } from '../pinned-corner';

describe('annotator/util/pinned-corner', () => {
  describe('pinnedCornerToLabel', () => {
    const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

    corners.forEach(corner => {
      it(`returns short label for ${corner}`, () => {
        assert.equal(pinnedCornerToLabel(corner, 'short'), corner);
      });

      it(`returns long label for ${corner}`, () => {
        assert.equal(
          pinnedCornerToLabel(corner, 'long'),
          `${corner} corner pinned`,
        );
      });
    });

    it('defaults to short format when format not provided', () => {
      assert.equal(pinnedCornerToLabel('top-left'), 'top-left');
    });

    it('uses top-left when corner is undefined (short)', () => {
      assert.equal(pinnedCornerToLabel(undefined, 'short'), 'top-left');
    });

    it('uses top-left when corner is undefined (long)', () => {
      assert.equal(
        pinnedCornerToLabel(undefined, 'long'),
        'top-left corner pinned',
      );
    });
  });
});
