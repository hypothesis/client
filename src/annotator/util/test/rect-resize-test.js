import {
  applyResizeArrowKey,
  canModifyFromPinnedCorner,
  getActiveEdges,
} from '../rect-resize';

describe('annotator/util/rect-resize', () => {
  const baseRect = {
    type: 'rect',
    left: 50,
    top: 50,
    right: 150,
    bottom: 120,
  };

  const constraints = {
    minWidth: 20,
    minHeight: 20,
    maxWidth: 500,
    maxHeight: 400,
    increment: 10,
  };

  describe('getActiveEdges', () => {
    it('returns right and bottom for top-left', () => {
      assert.deepEqual(getActiveEdges('top-left'), {
        top: false,
        right: true,
        bottom: true,
        left: false,
      });
    });

    it('returns left and bottom for top-right', () => {
      assert.deepEqual(getActiveEdges('top-right'), {
        top: false,
        right: false,
        bottom: true,
        left: true,
      });
    });

    it('returns left and top for bottom-right', () => {
      assert.deepEqual(getActiveEdges('bottom-right'), {
        top: true,
        right: false,
        bottom: false,
        left: true,
      });
    });

    it('returns right and top for bottom-left', () => {
      assert.deepEqual(getActiveEdges('bottom-left'), {
        top: true,
        right: true,
        bottom: false,
        left: false,
      });
    });

    it('returns all edges true for unknown corner (default branch)', () => {
      assert.deepEqual(getActiveEdges('unknown'), {
        top: true,
        right: true,
        bottom: true,
        left: true,
      });
    });
  });

  describe('canModifyFromPinnedCorner', () => {
    ['top-left', 'top-right', 'bottom-right', 'bottom-left'].forEach(corner => {
      it(`returns true for active keys with ${corner}`, () => {
        const edges = getActiveEdges(corner);
        if (edges.top || edges.bottom) {
          assert.isTrue(canModifyFromPinnedCorner('ArrowUp', corner));
          assert.isTrue(canModifyFromPinnedCorner('ArrowDown', corner));
        }
        if (edges.left || edges.right) {
          assert.isTrue(canModifyFromPinnedCorner('ArrowLeft', corner));
          assert.isTrue(canModifyFromPinnedCorner('ArrowRight', corner));
        }
      });
    });

    it('returns false for unknown key', () => {
      assert.isFalse(canModifyFromPinnedCorner('ArrowFoo', 'top-left'));
    });

    it('returns true for any arrow key with unknown corner', () => {
      // When corner is unknown, all edges are active, so all keys should return true
      assert.isTrue(canModifyFromPinnedCorner('ArrowUp', 'unknown-corner'));
      assert.isTrue(canModifyFromPinnedCorner('ArrowDown', 'unknown-corner'));
      assert.isTrue(canModifyFromPinnedCorner('ArrowLeft', 'unknown-corner'));
      assert.isTrue(canModifyFromPinnedCorner('ArrowRight', 'unknown-corner'));
    });
  });

  describe('applyResizeArrowKey', () => {
    describe('top-left pinned', () => {
      it('ArrowRight expands right', () => {
        const r = applyResizeArrowKey(
          baseRect,
          'ArrowRight',
          'top-left',
          constraints,
        );
        assert.equal(r.right, 160);
        assert.equal(r.left, 50);
      });

      it('ArrowDown expands bottom', () => {
        const r = applyResizeArrowKey(
          baseRect,
          'ArrowDown',
          'top-left',
          constraints,
        );
        assert.equal(r.bottom, 130);
        assert.equal(r.top, 50);
      });

      it('ArrowLeft contracts right', () => {
        const r = applyResizeArrowKey(
          baseRect,
          'ArrowLeft',
          'top-left',
          constraints,
        );
        assert.equal(r.right, 140);
      });

      it('ArrowUp contracts bottom', () => {
        const r = applyResizeArrowKey(
          baseRect,
          'ArrowUp',
          'top-left',
          constraints,
        );
        assert.equal(r.bottom, 110);
      });

      it('ArrowRight expands right even when result width is still below minWidth', () => {
        // Expansion always applies so user can grow out of an invalid (too-small) state
        const small = { ...baseRect, left: 50, right: 59 };
        const r = applyResizeArrowKey(small, 'ArrowRight', 'top-left', {
          ...constraints,
          minWidth: 20,
          increment: 10,
        });
        assert.equal(r.right, 69);
      });
    });

    describe('top-right pinned', () => {
      it('ArrowRight contracts left', () => {
        const r = applyResizeArrowKey(
          baseRect,
          'ArrowRight',
          'top-right',
          constraints,
        );
        assert.equal(r.left, 60);
        assert.equal(r.right, 150);
      });

      it('ArrowDown expands bottom', () => {
        const r = applyResizeArrowKey(
          baseRect,
          'ArrowDown',
          'top-right',
          constraints,
        );
        assert.equal(r.bottom, 130);
      });

      it('ArrowLeft expands left', () => {
        const r = applyResizeArrowKey(
          baseRect,
          'ArrowLeft',
          'top-right',
          constraints,
        );
        assert.equal(r.left, 40);
      });

      it('ArrowUp contracts bottom', () => {
        const r = applyResizeArrowKey(
          baseRect,
          'ArrowUp',
          'top-right',
          constraints,
        );
        assert.equal(r.bottom, 110);
      });

      it('ArrowLeft expands left edge', () => {
        const narrow = { ...baseRect, left: 120, right: 150 };
        const r = applyResizeArrowKey(
          narrow,
          'ArrowLeft',
          'top-right',
          constraints,
        );
        assert.equal(r.left, 110);
        assert.equal(r.right, 150);
      });
    });

    describe('bottom-right pinned', () => {
      it('ArrowRight contracts left', () => {
        const r = applyResizeArrowKey(
          baseRect,
          'ArrowRight',
          'bottom-right',
          constraints,
        );
        assert.equal(r.left, 60);
      });

      it('ArrowDown contracts top', () => {
        const r = applyResizeArrowKey(
          baseRect,
          'ArrowDown',
          'bottom-right',
          constraints,
        );
        assert.equal(r.top, 60);
      });

      it('ArrowLeft expands left', () => {
        const r = applyResizeArrowKey(
          baseRect,
          'ArrowLeft',
          'bottom-right',
          constraints,
        );
        assert.equal(r.left, 40);
      });

      it('ArrowUp expands top', () => {
        const r = applyResizeArrowKey(
          baseRect,
          'ArrowUp',
          'bottom-right',
          constraints,
        );
        assert.equal(r.top, 40);
      });

      it('ArrowUp expands top edge', () => {
        const short = { ...baseRect, top: 95, bottom: 120 };
        const r = applyResizeArrowKey(
          short,
          'ArrowUp',
          'bottom-right',
          constraints,
        );
        assert.equal(r.top, 85);
        assert.equal(r.bottom, 120);
      });
    });

    describe('bottom-left pinned', () => {
      it('ArrowRight expands right', () => {
        const r = applyResizeArrowKey(
          baseRect,
          'ArrowRight',
          'bottom-left',
          constraints,
        );
        assert.equal(r.right, 160);
      });

      it('ArrowDown contracts top', () => {
        const r = applyResizeArrowKey(
          baseRect,
          'ArrowDown',
          'bottom-left',
          constraints,
        );
        assert.equal(r.top, 60);
      });

      it('ArrowLeft contracts right', () => {
        const r = applyResizeArrowKey(
          baseRect,
          'ArrowLeft',
          'bottom-left',
          constraints,
        );
        assert.equal(r.right, 140);
      });

      it('ArrowUp expands top', () => {
        const r = applyResizeArrowKey(
          baseRect,
          'ArrowUp',
          'bottom-left',
          constraints,
        );
        assert.equal(r.top, 40);
      });

      it('ArrowRight expands right edge', () => {
        const narrow = { ...baseRect, left: 50, right: 65 };
        const r = applyResizeArrowKey(
          narrow,
          'ArrowRight',
          'bottom-left',
          constraints,
        );
        assert.equal(r.right, 75);
        assert.equal(r.left, 50);
      });
    });

    it('does not mutate input rect', () => {
      const input = { ...baseRect };
      applyResizeArrowKey(input, 'ArrowRight', 'top-left', constraints);
      assert.equal(input.right, baseRect.right);
    });
  });
});
